'use strict';

const TapTag = require('../api/taptag/models/tapTag.model');
const taptagService = require('../api/taptag/taptag.service');
const { decryptPhone, formatPhoneForTel } = require('../utility/util');
const config = require('../config/environment');

const VISITOR_REASONS = [
  { value: 'lights', label: 'The lights of this vehicle are on.', icon: '💡' },
  { value: 'no-parking', label: 'The vehicle is parked in a no parking zone.', icon: '🚫' },
  { value: 'towed', label: 'The vehicle is getting towed.', icon: '🚛' },
  { value: 'open', label: 'The window or vehicle appears open.', icon: '🪟' },
  { value: 'concern', label: 'Something seems wrong with this vehicle.', icon: '⚠️' },
];

const getReasonLabel = (value) =>
  VISITOR_REASONS.find((reason) => reason.value === value)?.label || 'Visitor message';

const formatVehicleNumber = (value = '') => {
  const normalized = value.replace(/\s+/g, '').toUpperCase();
  if (!normalized) {
    return { display: 'XXXX ####', prefix: 'XXXX', suffixMasked: '####' };
  }
  const visibleLength = Math.max(0, normalized.length - 4);
  const prefixRaw = normalized.slice(0, visibleLength);
  const prefix = prefixRaw.replace(/(.{2})/g, '$1 ').trim();
  return {
    display: `${prefix || prefixRaw} ####`.trim(),
    prefix: prefix || prefixRaw,
    suffixMasked: '####',
  };
};

const renderTagPage = async (req, res) => {
  const tag = await TapTag.findOne({ shortCode: req.params.shortCode })
    .populate('ownerAssignedTo')
    .lean();

  if (!tag || tag.status === 'archived') {
    return res.status(404).render('pages/not-found', {
      pageTitle: 'Tag not found',
      message: 'This TapTag is not available. Please contact support if you believe this is an error.',
    });
  }

  const owner = tag.ownerAssignedTo;

  if (tag.status !== 'activated' || !owner) {
    return res.status(409).render('pages/not-found', {
      pageTitle: 'Tag not active',
      message: 'This TapTag has not been activated yet. Please try again later.',
    });
  }

  const vehicleType = owner.vehicle?.type
    ? owner.vehicle.type.charAt(0).toUpperCase() + owner.vehicle.type.slice(1)
    : 'vehicle';
  const vehicleNumber = owner.vehicle?.number || '';
  const vehicleDisplay = formatVehicleNumber(vehicleNumber);

  // Decrypt phone number for tel: link (but don't display it)
  let ownerPhoneForCall = null;
  try {
    if (owner.encryptedPhone) {
      const decryptedPhone = decryptPhone(owner.encryptedPhone);
      ownerPhoneForCall = formatPhoneForTel(decryptedPhone);
    } else if (owner.phone) {
      // Fallback for old records without encryption
      ownerPhoneForCall = formatPhoneForTel(owner.phone);
    }
  } catch (error) {
    (global).logger?.warn?.({ error: error.message }, 'Failed to decrypt phone number');
  }

  // Get virtual number if available (backup option)
  let virtualNumber = null;
  try {
    const result = await taptagService.getVirtualNumber({}, {});
    virtualNumber = result.virtualNumber;
  } catch (error) {
    // Virtual number not configured, continue without it
    (global).logger?.warn?.('Virtual number not available');
  }

  res.render('pages/tag', {
    pageTitle: `Contact ${vehicleType} owner`,
    additionalScripts: ['/assets/js/tag-page.js'],
    bodyClass: 'tag-page',
    tag: {
      tagId: tag.tagId,
      shortCode: tag.shortCode,
      vehicleType,
      vehicleDisplay,
      ownerName: owner.fullName || 'Owner',
      emergencyNumber: config.emergencyNumber,
      ownerPhoneForCall, // For tel: link (not displayed)
      virtualNumber, // Backup option (Twilio)
      support: {
        whatsapp: config.support.whatsapp,
        helpUrl: config.support.helpUrl,
        dashboardUrl: config.support.dashboardUrl,
        orderUrl: config.support.orderUrl,
        shopUrl: config.support.shopUrl,
        email: config.support.email || 'hello@taptag.in',
      },
      brandName: config.brandName || 'TapTag',
    },
    reasons: VISITOR_REASONS,
  });
};

const handleTagMessage = async (req, res, next) => {
  const { reason, reasonLabel: submittedLabel, note, digits, callbackPhone } = req.body;
  const reasonLabel = submittedLabel || getReasonLabel(reason);
  const parts = [reasonLabel];
  if (note) {
    parts.push(note);
  }
  if (digits) {
    parts.push(`Visitor entered plate digits: ${digits}`);
  }
  if (callbackPhone) {
    parts.push(`Callback number: ${callbackPhone}`);
  }
  const compiledMessage = parts.join(' | ');

  try {
    await taptagService.submitMessage({
      shortCode: req.params.shortCode,
      message: compiledMessage,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      meta: {
        reason,
        reasonLabel,
        note,
        digits,
        callbackPhone,
      },
    }, {});

    if (req.accepts('json')) {
      return res.status(201).json({ message: 'Message delivered to the owner' });
    }

    return res.redirect(303, '/thanks');
  } catch (error) {
    if (error.message === 'Tag not found' || error.message === 'Tag is not active yet') {
      if (req.accepts('json')) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(400).render('pages/not-found', {
        pageTitle: 'Unable to deliver message',
        message: error.message,
      });
    }
    return next(error);
  }
};

const handleCallRequest = async (req, res, next) => {
  const { reason, reasonLabel: submittedLabel, note, digits, callbackPhone } = req.body;
  const reasonLabel = submittedLabel || getReasonLabel(reason);

  try {
    await taptagService.requestCallBack({
      shortCode: req.params.shortCode,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      meta: {
        reason,
        reasonLabel,
        note,
        digits,
        callbackPhone,
      },
    }, {});

    if (req.accepts('json')) {
      return res.status(202).json({ message: 'Call-back request submitted' });
    }

    return res.redirect(303, '/thanks');
  } catch (error) {
    if (error.message === 'Tag not found' || error.message === 'Tag is not active yet') {
      if (req.accepts('json')) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(400).render('pages/not-found', {
        pageTitle: 'Unable to submit call request',
        message: error.message,
      });
    }
    return next(error);
  }
};

const renderThankYou = (req, res) => {
  res.render('pages/thank-you', {
    pageTitle: 'Thank you',
    bodyClass: 'tag-page',
  });
};

const renderPolicy = (title, content) => (req, res) =>
  res.render('pages/policy', {
    pageTitle: title,
    bodyClass: 'tag-page',
    content,
  });

module.exports = {
  renderTagPage,
  handleTagMessage,
  handleCallRequest,
  renderThankYou,
  renderPrivacy: renderPolicy('Privacy Policy', [
    {
      heading: 'Data usage',
      body: 'We only collect the minimum data required to activate TapTag cards and deliver notifications.',
    },
    {
      heading: 'Contact privacy',
      body: 'Phone numbers are never shown publicly and are only used to relay notifications.',
    },
  ]),
  renderTerms: renderPolicy('Terms & Conditions', [
    {
      heading: 'Usage guidelines',
      body: 'TapTag cards must be used responsibly. Misuse may lead to suspension of services.',
    },
    {
      heading: 'Liability',
      body: 'TapTag facilitates communication between visitors and vehicle owners. We are not liable for actions taken by either party.',
    },
  ]),
  VISITOR_REASONS,
  getReasonLabel,
};

