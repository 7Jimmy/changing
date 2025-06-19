// // authController.js (ES6 module style)

// import User from '../models/User.js';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import sendEmail from '../utils/sendEmail.js'; // assuming you have this helper

// export const loginUser = async (req, res) => {
//   const { email, password, rememberMe } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     if (!user.isActive) {
//       return res.status(403).json({ message: 'Account not active yet' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: '1d',
//     });

//     const cookieOptions = {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: rememberMe
//         ? 30 * 24 * 60 * 60 * 1000
//         : 24 * 60 * 60 * 1000,
//     };

//     res
//       .cookie('token', token, cookieOptions)
//       .status(200)
//       .json({
//         message: 'Login successful',
//         user: {
//           id: user._id,
//           email: user.email,
//           role: user.role,
//           fullName: user.fullName,
//         },
//       });

//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };

// export const registerUser = async (req, res) => {
//   const token = req.params.token;
//   const {  password, confirmPassword } = req.body;

//   if (password !== confirmPassword) {
//     return res.status(400).json({ message: "Passwords do not match" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id);

//     if (!user || user.isActive) {
//       return res.status(400).json({ message: "Invalid or expired token" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

    
//     user.password = hashedPassword;
//     user.status = "active";
//     user.isActive = true;

//     await user.save();

//     res.status(200).json({ message: "Registration successful. You can now login." });
//   } catch (err) {
//     res.status(500).json({ message: "Registration failed", error: err.message });
//   }
// };

// export const forgotPassword = async (req, res) => {
//   const { email } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "15m",
//     });

//     const resetUrl = `${process.env.BASE_URL}/reset-password/${token}`;
//     const message = `
//   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
//     <h2 style="color: #333; text-align: center;">🔒 Password Reset Request</h2>
//     <p style="font-size: 16px; color: #555;">
//       Hello,<br><br>
//       We received a request to reset your password. Click the button below to set a new password:
//     </p>
//     <div style="text-align: center; margin: 30px 0;">
//       <a href="${resetUrl}" style="background-color: #5c4631; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
//         Reset Password
//       </a>
//     </div>
//     <p style="font-size: 14px; color: #888; text-align: center;">
//       If you didn’t request this, you can safely ignore this email.
//     </p>
//     <p style="font-size: 12px; color: #bbb; text-align: center; margin-top: 40px;">
//       &copy; ${new Date().getFullYear()} Ease & Mind Flex Spaces
//     </p>
//   </div>
// `;


//     await sendEmail(user.email, "Reset Your Password", message);
//     res.status(200).json({ message: "Password reset email sent." });
//   } catch (err) {
//     res.status(500).json({ message: "Reset email failed", error: err.message });
//   }
// };

// export const resetPassword = async (req, res) => {
//   const token = req.params.token;
//   const { password, confirmPassword } = req.body;

//   if (password !== confirmPassword) {
//     return res.status(400).json({ message: "Passwords do not match" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id);
//     if (!user) return res.status(400).json({ message: "Invalid token" });

//     const hashedPassword = await bcrypt.hash(password, 10);
//     user.password = hashedPassword;
//     user.isActive = true;
//     await user.save();

//     res.status(200).json({ message: "Password has been reset successfully." });
//   } catch (err) {
//     res.status(500).json({ message: "Reset failed", error: err.message });
//   }
// };

// export const logoutUser = (req, res) => {
//   res.clearCookie('token', {
//     httpOnly: true,
//     sameSite: 'strict',
//     secure: process.env.NODE_ENV === 'production',
//   });

//   res.status(200).json({ message: 'Logged out successfully' });
// };


import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail.js'; // assuming you have this helper

export const loginUser = async (req, res) => {
  const { email, password, rememberMe } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account not active yet' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe
        ? 30 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000,
    };

    res
      .cookie('token', token, cookieOptions)
      .status(200)
      .json({
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
        },
      });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const registerUser = async (req, res) => {
  const token = req.params.token;
  const {  password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.isActive) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    
    user.password = hashedPassword;
    user.status = "active";
    user.isActive = true;

    await user.save();

    res.status(200).json({ message: "Registration successful. You can now login." });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const resetUrl = `${process.env.BASE_URL}/reset-password/${token}`;
    const message = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h2 style="color: #333; text-align: center;">🔒 Password Reset Request</h2>
    <p style="font-size: 16px; color: #555;">
      Hello,<br><br>
      We received a request to reset your password. Click the button below to set a new password:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background-color: #5c4631; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Reset Password
      </a>
    </div>
    <p style="font-size: 14px; color: #888; text-align: center;">
      If you didn’t request this, you can safely ignore this email.
    </p>
    <p style="font-size: 12px; color: #bbb; text-align: center; margin-top: 40px;">
      &copy; ${new Date().getFullYear()} Ease & Mind Flex Spaces
    </p>
  </div>
`;


    await sendEmail(user.email, "Reset Your Password", message);
    res.status(200).json({ message: "Password reset email sent." });
  } catch (err) {
    res.status(500).json({ message: "Reset email failed", error: err.message });
  }
};

export const resetPassword = async (req, res) => {
  const token = req.params.token;
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({ message: "Invalid token" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.isActive = true;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (err) {
    res.status(500).json({ message: "Reset failed", error: err.message });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  res.status(200).json({ message: 'Logged out successfully' });
};
