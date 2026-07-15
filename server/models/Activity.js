const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
{
    uploadedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true,
    },
    action:{
        type:String,
        required:true,
    },

    fileName:{
        type:String,
    },

    icon:{
        type:String,
    },

    color:{
        type:String,
    },

    createdAt:{
        type:Date,
        default:Date.now,
    }

});

module.exports = mongoose.model(
    "Activity",
    activitySchema
);
