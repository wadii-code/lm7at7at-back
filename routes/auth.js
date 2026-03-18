const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};


module.exports = (supabase) => {
  // User Signup
  router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    try {
      // Check if user already exists
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();

      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
        
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user in Supabase
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{ name, email, password_hash: hashedPassword }])
        .select('id, name, email, is_admin, created_at')
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return res.status(500).json({ message: 'Failed to create user', error: insertError.message });
      }

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          isAdmin: newUser.is_admin,
        },
      });

    } catch (error) {
      console.error('Signup Error:', error);
      res.status(500).json({ message: 'Server error during signup' });
    }
  });

  // User Login
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      // --- TEMPORARY DEBUG LOG ---
      console.log('User data from database for login attempt:', user);

      if (error || !user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, isAdmin: user.is_admin },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.is_admin,
        },
      });

    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  });
    
  // Get current user profile
  router.get('/me', authMiddleware, async (req, res) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, is_admin')
        .eq('id', req.user.id)
        .single();

      if (error || !user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.is_admin,
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update user profile
  router.put('/profile', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { name, oldPassword, newPassword } = req.body;

    // --- DEBUG LOGS ---
    console.log(`[PROFILE UPDATE] Attempting update for user ID: ${userId}`);
    console.log(`[PROFILE UPDATE] Received data:`, { name, oldPassword: oldPassword ? '******' : undefined, newPassword: newPassword ? '******' : undefined });

    try {
      // Fetch the current user from the database
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const updates = {};
      if (name) {
        updates.name = name;
      }

      // Update password if provided
      if (oldPassword && newPassword) {
        console.log('[PROFILE UPDATE] Old and new passwords provided. Verifying old password...');
        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
        console.log(`[PROFILE UPDATE] Old password match result: ${isMatch}`);

        if (!isMatch) {
          return res.status(400).json({ message: 'Incorrect old password' });
        }

        console.log('[PROFILE UPDATE] Old password correct. Hashing and updating new password...');
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        updates.password_hash = passwordHash;
      }

      // Perform the update if there are any changes
      if (Object.keys(updates).length > 0) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId)
          .select('id, name, email, is_admin')
          .single();

        if (updateError) {
          console.error('Error updating profile:', updateError);
          return res.status(500).json({ message: 'Failed to update profile' });
        }
        
        res.json({
          message: 'Profile updated successfully',
          user: updatedUser,
        });
      } else {
        res.json({ message: 'No changes provided to update.' });
      }

    } catch (error) {
      console.error('Profile Update Error:', error);
      res.status(500).json({ message: 'Server error during profile update' });
    }
  });

  return router;
};