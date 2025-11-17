const mongoose = require('mongoose');

const { Schema } = mongoose;

const TapTagSaleSchema = new Schema(
  {
    tag: {
      type: Schema.Types.ObjectId,
      ref: 'TapTag',  // qr code id ko refer karne ke liye
      required: true,
      index: true,
    },
    SalesPerson: {
      type: Schema.Types.ObjectId,
      ref: 'User',  // affiliate user id ko refer karne ke liye
      required: false,
      default: null,
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'TapTagUser',  // owner user id ko refer karne ke liye
      required: true,
      index: true,
    },
    saleDate: {
      type: Date, // sale date ko refer karne ke liye
      required: true,
    },
    saleType: {
      type: String, // sale type ko refer karne ke liye
      enum: ['online', 'offline','not-confirmed'],
      required: false,
      default: 'not-confirmed',
    },
    
    salesPersonRole: {
      type: String,
      enum: ['Affiliate', 'Support Admin','Admin','Super Admin'],
      required: true,
    },
    
    totalSaleAmount: {
        type: Number,
        required: false, // Total sale amount ko refer karne ke liye
        default: 0,
      },
    commisionAmountOfSalesPerson: {
        type: Number,
        required: false, // commision amount ko refer karne ke liye
        default: 0,
      },
    commisionAmountOfOwner: {
        type: Number,
        required: false, // commision amount ko refer karne ke liye
        default: 0,
      },
    //lagat 
    castAmountOfProductAndServices: {
        type: Number,
        required: false, // cast amount ko refer karne ke liye
        default: 0,
      },

      // for sale status and payment status and varification status
      paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
      },
      varificationStatus: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        required: true,
      },
      message: {
        type: [
          {
            message: {
              type: String,
              default: null,
            },
          },
        ],
        required: false,
        default: [],
      },
      paymentImageOrScreenShot: {
        type: String,
        required: false,
        default: null,
      },

     createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true,
      },

      deletedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true,
      },
      createdAt: {
        type: Date,
        required: true,    
      },
      updatedAt: {
        type: Date,
        required: false,    
      },
      deletedAt: {
        type: Date,
        required: false,    
      },
  },
  {
    timestamps: false, // Manual timestamps
  }
);

module.exports = mongoose.models.TapTagSale || mongoose.model('TapTagSale', TapTagSaleSchema);