// controllers/userController.js

export const getUserProfile = (req, res) => {
  try {
    res.status(200).json({
      id: req.user._id,
      email: req.user.email,
      username: req.user.username,
      fullName: req.user.fullName,
      role: req.user.role,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get profile", error: error.message });
  }
};
