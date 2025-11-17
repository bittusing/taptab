const mongoose = require('mongoose');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const TapTag = require('./models/tapTag.model');
const TapTagUser = require('./models/tapTagUser.model');
const TapTagActivationToken = require('./models/tapTagActivationToken.model');
const TapTagMessage = require('./models/tapTagMessage.model');
const VirtualCall = require('./models/virtualCall.model');
const { generateQrImage } = require('../../utility/qr.util');
const { encryptPhone } = require('../../utility/util');
const securityUtil = require('../../utility/security.util');
const config = require('../../config/environment');
const UserModel = require('../user/user.model');
const OTP_TTL_MINUTES = config.notification.otpTtlMinutes || 10;
const MAX_BULK_COUNT = 500;
const { SaleCreateForAffiliate } = require('../taptagSale/taptagSale.service');

// ==================== Tag Management ====================

exports.generateBulk = async (body, user) => {
    try {
        const { count, batchName, metadata , assignedTo } = body;
        const generatedBy = user._id;

        if (!Number.isInteger(count) || count <= 0) {
            throw new Error('Count must be a positive integer');
        }

        if (count > MAX_BULK_COUNT) {
            throw new Error(`You can generate up to ${MAX_BULK_COUNT} tags in a single batch`);
        }

        const session = await mongoose.startSession();
        let transactionCommitted = false;
        try {
            session.startTransaction();

            const createIdentifiers = async () => {
                const tagId = uuidv4();
                const shortCode = crypto.randomBytes(6).toString('base64url').slice(0, 8).toLowerCase();
                const baseUrl = (config.publicBaseUrl || '').replace(/\/$/, '');
                const shortUrl = `${baseUrl}/r/${shortCode}`;
                const { qrUrl } = await generateQrImage({ shortCode, targetUrl: shortUrl });

                return {
                    tagId,
                    shortCode,
                    shortUrl,
                    qrUrl,
                };
            };

            const docs = await Promise.all(
                Array.from({ length: count }).map(async () => {
                    const identifiers = await createIdentifiers();
                    return {
                        ...identifiers,
                        status: assignedTo ? 'assigned' : 'generated',
                        batchName: batchName || `batch-${new Date().toISOString().slice(0, 10)}`,
                        generatedBy: generatedBy || null,
                        assignedTo: assignedTo || null,
                        metadata: metadata || {},
                    };
                })
            );

            const result = await TapTag.insertMany(docs, { session });
            await session.commitTransaction();
            transactionCommitted = true;
            return result;
        } catch (error) {
            if (!transactionCommitted) {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.list = async (query, user) => {
    try {
        const { status, search, batchName, page = 1, limit = 25 } = query;

        const queryObj = {};
        if (status) {
            queryObj.status = status;
        }
        if (batchName) {
            queryObj.batchName = batchName;
        }
        if (search) {
            queryObj.$or = [
                { tagId: { $regex: search, $options: 'i' } },
                { shortCode: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            TapTag.find(queryObj)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit, 10))
                .populate('assignedTo')
                .populate('ownerAssignedTo')
                .lean(),
            TapTag.countDocuments(queryObj),
        ]);

        return {
            items,
            total,
            page: parseInt(page, 10),
            pages: Math.ceil(total / limit),
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.getSummary = async (query, user) => {
    try {
        const [totalTags, activeTags, archivedTags, messageCounts, userCount] = await Promise.all([
            TapTag.countDocuments(),
            TapTag.countDocuments({ status: 'activated' }),
            TapTag.countDocuments({ status: 'archived' }),
            TapTag.aggregate([
                {
                    $lookup: {
                        from: 'taptagmessages',
                        localField: '_id',
                        foreignField: 'tag',
                        as: 'messages',
                    },
                },
                { $unwind: '$messages' },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        lastMessageAt: { $max: '$messages.createdAt' },
                    },
                },
            ]),
            TapTagUser.countDocuments({ isActive: true }),
        ]);

        const messagesSummary = messageCounts[0] || { total: 0, lastMessageAt: null };

        return {
            totalTags,
            activeTags,
            archivedTags,
            totalMessages: messagesSummary.total,
            lastMessageAt: messagesSummary.lastMessageAt,
            activeUsers: userCount,
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.updateStatus = async (body, user) => {
    try {
        const { shortCode, status } = body;

        const allowedStatuses = ['generated', 'assigned', 'activated', 'archived'];
        if (!allowedStatuses.includes(status)) {
            throw new Error('Invalid status');
        }

        const tag = await TapTag.findOneAndUpdate(
            { shortCode },
            { status },
            { new: true }
        );

        if (!tag) {
            throw new Error('Tag not found');
        }

        return {
            tagId: tag.tagId,
            shortCode: tag.shortCode,
            status: tag.status,
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

// ==================== Activation ====================

exports.requestOtp = async (body, user) => {
    try {
        const { tagId, shortCode, phone, ip } = body;

        const tag = await TapTag.findOne({
            $or: [{ tagId }, { shortCode }],
        });

        if (!tag) {
            throw new Error('Tag not found');
        }

        if (tag.status === 'archived') {
            throw new Error('Tag is archived and cannot be activated');
        }

        const otp = securityUtil.generateOtp();
        const otpHash = await securityUtil.hashOtp(otp);
        const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

        await TapTagActivationToken.findOneAndUpdate(
            { tag: tag._id, phone },
            {
                otpHash,
                expiresAt,
                attempts: 0,
                context: new Map(Object.entries({ ip: ip || 'unknown' })),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Send OTP via notification service (if configured)
        // await notificationService.sendOtp({ phone, otp, tag });

        return {
            expiresAt,
            otp,
            tagId: tag.tagId,
            shortCode: tag.shortCode,
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.confirmActivation = async (body, user) => {
    try {
        const {
            tagId,
            shortCode,
            otp,
            fullName,
            phone,
            email,
            vehicleNumber,
            vehicleType,
            city,
            preferences = {},
            ip,
            totalSaleAmount = 299,
            castAmountOfProductAndServices = 129,
        } = body;

        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const tag = await TapTag.findOne(
                {
                    $or: [{ tagId }, { shortCode }],
                },
                null,
                { session }
            );

            if (!tag) {
                throw new Error('Tag not found');
            }

            const token = await TapTagActivationToken.findOne(
                { tag: tag._id, phone },
                null,
                { session }
            );

            if (!token) {
                throw new Error('OTP expired or not requested');
            }

            if (token.attempts >= token.maxAttempts) {
                throw new Error('Maximum verification attempts exceeded');
            }

            const isValidOtp = await securityUtil.verifyOtp(otp, token.otpHash);
            if (!isValidOtp) {
                token.attempts += 1;
                await token.save({ session });
                throw new Error('Invalid OTP');
            }

            const vehiclePayload = {
                number: vehicleNumber.trim().toUpperCase(),
                type: vehicleType || 'car',
            };

            const encryptedPhone = encryptPhone(phone);

            const tapTagUser = await TapTagUser.findOneAndUpdate(
                {
                    $or: [
                        { phone },
                        { 'vehicle.number': vehiclePayload.number },
                    ],
                },
                {
                    fullName,
                    phone,
                    encryptedPhone,
                    email,
                    city,
                    vehicle: vehiclePayload,
                    preferences: { ...preferences },
                    isActive: true,
                    $addToSet: { tags: tag._id },
                },
                { new: true, upsert: true, setDefaultsOnInsert: true, session }
            );

            tag.status = 'activated';
            tag.ownerAssignedTo = tapTagUser._id;
            tag.activation = {
                activatedAt: new Date(),
                activatedIp: ip || null,
                verifiedAt: new Date(),
                activatedBy: user._id,
            };

            await tag.save({ session });
            await TapTagActivationToken.deleteOne({ _id: token._id }, { session });

            await session.commitTransaction();

            // create a sale for the affiliate user in background not wait for the response
            //  using the taptagSale.service.js file
            let salesPersonId = '';
            if (user.role === 'Affiliate') {
                /// if affiliate hai then we hi sale kiya hoga 
                salesPersonId = user._id;
            } else if (user.role === 'Support Admin' || user.role === 'Admin' || user.role === 'Super Admin') {
                if (tag?.assignedTo) {
                    ///// agar admin hai then wo assign use ka sale activate 
                    // kr rha hoga means assign hi sale kiya hoga
                    salesPersonId = tag?.assignedTo || null;
                } else {
                    console.log('No affiliate assigned to this tag');
                    salesPersonId = user._id;
                }

            }

            ////get commission percentage from user model
            const commissionDoc = await UserModel.findById({_id: salesPersonId}).select('commissionPercentage');
            if (!commissionDoc) {
                throw new Error('Commission percentage not found');
            }
            const commissionPercentage = Number(commissionDoc.commissionPercentage) || 0;

            const commisionAmountOfSalesPerson = (totalSaleAmount * commissionPercentage) / 100;
            const commisionAmountOfOwner = (totalSaleAmount - castAmountOfProductAndServices) - commisionAmountOfSalesPerson;

            const saleBody = {
                tag: tag._id,
                SalesPerson: salesPersonId,  //this is imp 
                owner: tapTagUser._id,
                saleDate: new Date(),
                saleType: 'not-confirmed',
                totalSaleAmount: totalSaleAmount || 0,
                commisionAmountOfSalesPerson: commisionAmountOfSalesPerson || 0,
                commisionAmountOfOwner: commisionAmountOfOwner || 0,
                castAmountOfProductAndServices: castAmountOfProductAndServices || 0,
                paymentStatus: 'pending',
                varificationStatus: 'pending',
                message: [
                    {   
                        message:   `Tag activated successfully By 
                        ${user.fullName}(${user.phone} & ${user._id})
                        and owner is ${tapTagUser.fullName}(${tapTagUser.phone}
                          & ${tapTagUser.email}) and tag is ${tag.tagId}(${tag.shortCode}) and 
                        short code is ${tag.shortCode}`,
                    },
                ],
                paymentImageOrScreenShot: null,
                createdBy: user._id,
                updatedBy: user._id,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const sale = await SaleCreateForAffiliate(saleBody, user).catch((error) => {
                console.error('Error creating sale for affiliate user:', error);
            });

            return {
                tagId: tag.tagId,
                shortCode: tag.shortCode,
                shortUrl: tag.shortUrl,
                assignedTo: {
                    fullName: tapTagUser.fullName,
                    phone: tapTagUser.phone,
                    vehicle: tapTagUser.vehicle,
                },
                sale: sale?._id || '',
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error) {
        throw new Error(error.message);
    }
};

// ==================== Messages ====================

exports.submitMessage = async (body, user) => {
    try {
        const { shortCode, message, ip, userAgent, meta } = body;

        const tag = await TapTag.findOne({ shortCode }).populate('ownerAssignedTo');

        if (!tag) {
            throw new Error('Tag not found');
        }

        if (tag.status !== 'activated') {
            throw new Error('Tag is not active yet');
        }

        const senderIpHash = securityUtil.hashIp(ip || 'unknown');

        const sanitizeMeta = (meta = {}) =>
            Object.fromEntries(
                Object.entries(meta).filter(([, value]) => value !== undefined && value !== null && value !== '')
            );

        const metaPayload = sanitizeMeta(meta);

        const entry = await TapTagMessage.create({
            tag: tag._id,
            channel: 'message',
            message,
            senderIpHash,
            userAgent: userAgent || 'unknown',
            meta: metaPayload,
        });

        tag.activation = {
            ...(tag.activation || {}),
            lastMessageAt: new Date(),
        };
        await tag.save();

        // Notify owner (if notification service configured)
        // await notificationService.notifyMessage({ tag, message, entry, meta: metaPayload });

        return entry;
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.requestCallBack = async (body, user) => {
    try {
        const { shortCode, ip, userAgent, meta } = body;

        const tag = await TapTag.findOne({ shortCode }).populate('ownerAssignedTo');

        if (!tag) {
            throw new Error('Tag not found');
        }

        if (tag.status !== 'activated') {
            throw new Error('Tag is not active yet');
        }

        const senderIpHash = securityUtil.hashIp(ip || 'unknown');

        const sanitizeMeta = (meta = {}) =>
            Object.fromEntries(
                Object.entries(meta).filter(([, value]) => value !== undefined && value !== null && value !== '')
            );

        const metaPayload = sanitizeMeta(meta);

        const entry = await TapTagMessage.create({
            tag: tag._id,
            channel: 'call-request',
            senderIpHash,
            userAgent: userAgent || 'unknown',
            meta: metaPayload,
        });

        // Notify owner (if notification service configured)
        // await notificationService.notifyCallRequest({ tag, meta: metaPayload, entry });

        return entry;
    } catch (error) {
        throw new Error(error.message);
    }
};

// ==================== Virtual Calls ====================

exports.getVirtualNumber = async (body, user) => {
    try {
        const virtualNumber = config.notification.twilio.phoneNumber;
        if (!virtualNumber) {
            throw new Error('Twilio phone number is not configured');
        }

        const formatPhoneNumber = (phone) => {
            if (!phone) return null;
            const cleaned = phone.replace(/\D/g, '');
            if (cleaned.startsWith('0')) {
                return `+91${cleaned.substring(1)}`;
            }
            if (!cleaned.startsWith('+')) {
                return `+91${cleaned}`;
            }
            return `+${cleaned}`;
        };

        return {
            virtualNumber: formatPhoneNumber(virtualNumber),
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.initiateCall = async (body, user) => {
    try {
        const { shortCode, visitorPhone, metadata = {} } = body;

        const tag = await TapTag.findOne({ shortCode }).populate('ownerAssignedTo');

        if (!tag) {
            throw new Error('Tag not found');
        }

        if (tag.status !== 'activated') {
            throw new Error('Tag is not active yet');
        }

        const owner = tag.ownerAssignedTo;
        if (!owner || !owner.phone) {
            throw new Error('Tag owner phone number not found');
        }

        const { accountSid, authToken, phoneNumber } = config.notification.twilio;
        if (!accountSid || !authToken || !phoneNumber) {
            throw new Error('Twilio is not configured');
        }

        let twilioClient;
        try {
            const Twilio = require('twilio');
            twilioClient = new Twilio(accountSid, authToken);
        } catch (error) {
            throw new Error('Twilio SDK not available');
        }

        const formatPhoneNumber = (phone) => {
            if (!phone) return null;
            const cleaned = phone.replace(/\D/g, '');
            if (cleaned.startsWith('0')) {
                return `+91${cleaned.substring(1)}`;
            }
            if (!cleaned.startsWith('+')) {
                return `+91${cleaned}`;
            }
            return `+${cleaned}`;
        };

        const virtualNumber = formatPhoneNumber(phoneNumber);
        const formattedVisitorPhone = formatPhoneNumber(visitorPhone);
        const formattedOwnerPhone = formatPhoneNumber(owner.phone);

        if (!formattedVisitorPhone || !formattedOwnerPhone) {
            throw new Error('Invalid phone number format');
        }

        const baseUrl = config.publicBaseUrl.replace(/\/$/, '');
        const callStatusCallback = `${baseUrl}/api/v1/call/status`;
        const callConnectUrl = `${baseUrl}/api/v1/call/connect?shortCode=${shortCode}&visitorPhone=${encodeURIComponent(formattedVisitorPhone)}&ownerPhone=${encodeURIComponent(formattedOwnerPhone)}`;

        const call = await twilioClient.calls.create({
            to: virtualNumber,
            from: formattedVisitorPhone,
            url: callConnectUrl,
            statusCallback: callStatusCallback,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST',
            record: false,
        });

        const virtualCall = await VirtualCall.create({
            tag: tag._id,
            ownerPhone: formattedOwnerPhone,
            visitorPhone: formattedVisitorPhone,
            virtualNumber,
            twilioCallSid: call.sid,
            status: 'initiated',
            direction: 'inbound',
            metadata,
        });

        return {
            callSid: call.sid,
            virtualNumber,
            status: 'initiated',
            virtualCallId: virtualCall._id,
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.getCallHistory = async (query, user) => {
    try {
        const { shortCode, limit = 10, page = 1 } = query;

        const tag = await TapTag.findOne({ shortCode });
        if (!tag) {
            throw new Error('Tag not found');
        }

        const skip = (page - 1) * limit;
        const [calls, total] = await Promise.all([
            VirtualCall.find({ tag: tag._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit, 10))
                .lean(),
            VirtualCall.countDocuments({ tag: tag._id }),
        ]);

        return {
            calls,
            total,
            page: parseInt(page, 10),
            pages: Math.ceil(total / limit),
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

// ==================== Affiliate Assignment ====================

exports.assignToAffiliate = async (body, user) => {
    try {
        const { tagIds, shortCodes, affiliateId } = body;

        if (!affiliateId) {
            throw new Error('Affiliate ID is required');
        }

        if ((!tagIds || tagIds.length === 0) && (!shortCodes || shortCodes.length === 0)) {
            throw new Error('Either tagIds or shortCodes is required');
        }

        const query = {};
        if (tagIds && tagIds.length > 0) {
            query.tagId = { $in: tagIds };
        }
        if (shortCodes && shortCodes.length > 0) {
            if (query.tagId) {
                query.$or = [
                    { tagId: { $in: tagIds } },
                    { shortCode: { $in: shortCodes } },
                ];
                delete query.tagId;
            } else {
                query.shortCode = { $in: shortCodes };
            }
        }

        const result = await TapTag.updateMany(
            query,
            {
                $set: {
                    assignedTo: affiliateId,
                    status: 'assigned',
                },
            }
        );

        return {
            matched: result.matchedCount,
            modified: result.modifiedCount,
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.getAffiliateTags = async (query, user) => {
    try {
        const { page = 1, limit = 25, status } = query;
        const affiliateId = user._id;

        const queryObj = {
            assignedTo: affiliateId,
        };

        if (status) {
            queryObj.status = status;
        }

        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            TapTag.find(queryObj)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit, 10))
                .populate('ownerAssignedTo')
                .lean(),
            TapTag.countDocuments(queryObj),
        ]);

        return {
            items,
            total,
            page: parseInt(page, 10),
            pages: Math.ceil(total / limit),
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

// ==================== Webhooks ====================

exports.updateCallStatus = async (body, user) => {
    try {
        const { callSid, status, duration, metadata = {} } = body;

        const virtualCall = await VirtualCall.findOne({ twilioCallSid: callSid });
        if (!virtualCall) {
            return null;
        }

        const statusMap = {
            queued: 'initiated',
            ringing: 'ringing',
            'in-progress': 'in-progress',
            completed: 'completed',
            busy: 'busy',
            'no-answer': 'no-answer',
            canceled: 'canceled',
            failed: 'failed',
        };

        const mappedStatus = statusMap[status] || status;

        const updateData = {
            status: mappedStatus,
            ...metadata,
        };

        if (duration) {
            updateData.duration = duration;
        }

        if (mappedStatus === 'in-progress' && !virtualCall.startedAt) {
            updateData.startedAt = new Date();
        }

        if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(mappedStatus)) {
            updateData.endedAt = new Date();
            if (!updateData.startedAt && virtualCall.startedAt) {
                updateData.startedAt = virtualCall.startedAt;
            }
        }

        await VirtualCall.updateOne({ _id: virtualCall._id }, { $set: updateData });

        return virtualCall;
    } catch (error) {
        throw new Error(error.message);
    }
};
