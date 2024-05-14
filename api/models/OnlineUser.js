const mongoose = require('mongoose');

const OnlineUserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
}, {
    timestamps: { createdAt: 'createdDate', updatedAt: 'lastModified' }
});

const OnlineUserModel = mongoose.model("OnlineUser", OnlineUserSchema);
module.exports = OnlineUserModel;
