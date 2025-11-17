const TapTagSale = require('./taptagSale.model');
const TapTag = require('../taptag/models/tapTag.model');
exports.saleList = async (query, user) => {
    try {
        const { page = 1, limit = 10 , salesPersonRole, salesPersonId, 
            ownerId, tagId, paymentStatus, varificationStatus, search } = query;
        const queryObj = {};
        if (search) {
            queryObj.$or = [
                { SalesPerson: { $regex: search, $options: 'i' } },
                { owner: { $regex: search, $options: 'i' } },
                { tag: { $regex: search, $options: 'i' } },
            ];
        }
        if (salesPersonRole) {
            queryObj.salesPersonRole = salesPersonRole;
        }
        if (salesPersonId) {
            queryObj.SalesPerson = salesPersonId;
        }
        if (ownerId) {
            queryObj.owner = ownerId;
        }
        if (tagId) {
            queryObj.tag = tagId;
        }
        if (paymentStatus) {
            queryObj.paymentStatus = paymentStatus;
        }
        if (varificationStatus) {
            queryObj.varificationStatus = varificationStatus;
        }
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            TapTagSale.find(queryObj || {})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit, 10))
                .populate('tag')
                .populate('SalesPerson', 'name email phone role isActive')
                .populate('owner', 'fullName phone email vehicle')
                .lean(),
            TapTagSale.countDocuments(queryObj || {}),
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


exports.saleCreate = async (body, user) => {
    try {
        const { tagId, salesPersonId, ownerId, saleDate, saleType, 
            totalSaleAmount, commisionAmountOfSalesPerson, commisionAmountOfOwner,
             castAmountOfProductAndServices, paymentStatus, 
             varificationStatus, message, paymentImageOrScreenShot, } = body;
            // if(user.role !== 'Affiliate') {
            //     throw new Error('You are not authorized to create a sale');  
            // }
            // if(user.role === 'Affiliate') {
                
            // }
             const sale = new TapTagSale({
                tag: tagId,
                SalesPerson: salesPersonId,
                owner: ownerId,
                salesPersonRole: user.role,
                saleDate: saleDate || new Date(),
                saleType: saleType || 'not-confirmed',
                totalSaleAmount: totalSaleAmount || 0,
                commisionAmountOfSalesPerson: commisionAmountOfSalesPerson || 0,
                commisionAmountOfOwner: commisionAmountOfOwner || 0,
                castAmountOfProductAndServices: castAmountOfProductAndServices || 0,
                paymentStatus: paymentStatus,
                varificationStatus: varificationStatus,
                message: message || [],
                paymentImageOrScreenShot: paymentImageOrScreenShot || null,
                createdBy: user._id, // Use authenticated user's ID
                updatedBy: user._id, // Use authenticated user's ID
                deletedBy: null,
                deletedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            await sale.save();
            return sale;
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.saleUpdate = async (id, body, user) => {
    try {
        const { tagId, salesPersonId, ownerId, saleDate, saleType, 
            totalSaleAmount, commisionAmountOfSalesPerson, commisionAmountOfOwner,
             castAmountOfProductAndServices, paymentStatus, 
             varificationStatus, message, paymentImageOrScreenShot, } = body;

             const sale = await TapTagSale.findByIdAndUpdate(id, {
                tag: tagId,
                SalesPerson: salesPersonId,
                owner: ownerId,
                salesPersonRole: user.role,
                saleDate: saleDate || new Date(),
                saleType: saleType || 'not-confirmed',
                totalSaleAmount: totalSaleAmount || 0,
                commisionAmountOfSalesPerson: commisionAmountOfSalesPerson || 0,
                commisionAmountOfOwner: commisionAmountOfOwner || 0,
                castAmountOfProductAndServices: castAmountOfProductAndServices || 0,
                paymentStatus: paymentStatus,
                varificationStatus: varificationStatus,
                message: message || [],
                paymentImageOrScreenShot: paymentImageOrScreenShot || null,
                updatedBy: user._id, // Use authenticated user's ID
                updatedAt: new Date(),
            }, { new: true });
            if(!sale) {
                throw new Error('Sale not found');
            }
            return sale;
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.SaleCreateForAffiliate = async (body, user) => {
    try {
        const { tag, SalesPerson, owner, saleDate, saleType,
             totalSaleAmount, commisionAmountOfSalesPerson, commisionAmountOfOwner,
              castAmountOfProductAndServices, paymentStatus, varificationStatus, 
              message, paymentImageOrScreenShot, createdBy, updatedBy, deletedBy,
               deletedAt, createdAt, updatedAt } = body;
               
        const sale = new TapTagSale({
            tag: tag,
            SalesPerson: SalesPerson || null,
            owner: owner,
            salesPersonRole: user?.role || 'Affiliate',
            saleDate: saleDate || new Date(),
            saleType: saleType || 'not-confirmed',
            totalSaleAmount: totalSaleAmount || 0,
            commisionAmountOfSalesPerson: commisionAmountOfSalesPerson || 0,
            commisionAmountOfOwner: commisionAmountOfOwner || 0,
            castAmountOfProductAndServices: castAmountOfProductAndServices || 0,
            paymentStatus: paymentStatus || 'pending',
            varificationStatus: varificationStatus || 'pending',
            message: message || [],
            paymentImageOrScreenShot: paymentImageOrScreenShot || null,
            createdBy: createdBy || user?._id,
            updatedBy: updatedBy || user?._id,
            createdAt: createdAt || new Date(),
            updatedAt: updatedAt || new Date(),
        });
        await sale.save();
        return sale;
    } catch (error) {
        throw new Error(error.message);
    }
};


exports.tagVarify = async (tagId, user) => {
    try {
        const tag = await TapTag.findOne({ shortCode: tagId , status: 'activated'}).populate('ownerAssignedTo', 'fullName phone email vehicle');

        if(!tag) {
            throw new Error('Tag not found');
        }    
        ///// now check already have a sale for this tag
        const sale = await TapTagSale.findOne({ tag: tag._id });
        if(sale) {
            throw new Error('Sale already exists for this tag');
        }
        ///// return ok creat sale manually
        // also return _id and name of owner and phone and email and vehicle number
        return {
            _id: tag._id,
            shortCode: tag.shortCode,
            shortUrl: tag.shortUrl,
            qrUrl: tag.qrUrl,
            status: tag.status,
            batchName: tag.batchName,
            assignedTo: tag.assignedTo,
            fullName: tag.ownerAssignedTo.fullName,
            phone: tag.ownerAssignedTo.phone,
            email: tag.ownerAssignedTo.email,
            vehicleNumber: tag.ownerAssignedTo.vehicle.number,
            vehicleType: tag.ownerAssignedTo.vehicle.type,
            ownerId: tag.ownerAssignedTo._id,
        };
        
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.saleDetail = async (id, user) => {
    try {
        const sale = await TapTagSale.findById(id).populate('tag').
        populate('SalesPerson', 'name email phone role isActive').
        populate('owner', 'fullName phone email vehicle').lean();
        if(!sale) {
            throw new Error('Sale not found');
        }
        return sale;
    } catch (error) {
        throw new Error(error.message);
    }
};