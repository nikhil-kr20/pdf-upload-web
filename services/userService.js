const User = require('../models/userlogin');
const bcrypt = require('bcryptjs');
const { isValidObjectId } = require('../utils/helpers');

class UserService {
  // Find user by username/email
  static async findByUsername(username) {
    return await User.findOne({ username });
  }

  // Find user by ID
  static async findById(id) {
    if (!isValidObjectId(id)) return null;
    return await User.findById(id).select('-password');
  }

  // Create a new user
  static async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = new User({
      ...userData,
      password: hashedPassword
    });
    return await user.save();
  }

  // Verify user credentials
  static async verifyCredentials(username, password) {
    const user = await this.findByUsername(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Update user profile
  static async updateProfile(userId, updateData) {
    if (!isValidObjectId(userId)) return null;
    
    // Don't allow password updates through this method
    if (updateData.password) {
      delete updateData.password;
    }

    return await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');
  }
}

module.exports = UserService;
