const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = (passport) => {
  // Only configure Google OAuth if credentials are provided
  if (process.env.GOOGLE_CLIENT_ID && 
      process.env.GOOGLE_CLIENT_SECRET && 
      process.env.GOOGLE_CLIENT_ID !== 'development-client-id') {
    
    // Google OAuth Strategy
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user already exists
            let existingUser = await User.findOne({ googleId: profile.id });
            
            if (existingUser) {
              // User exists, return the user
              return done(null, existingUser);
            }
            
            // Check if user exists with same email
            existingUser = await User.findOne({ email: profile.emails[0].value });
            
            if (existingUser) {
              // Link Google account to existing user
              existingUser.googleId = profile.id;
              await existingUser.save();
              return done(null, existingUser);
            }
          
          // Create new user
          const newUser = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
            provider: 'google',
          });
          
          const savedUser = await newUser.save();
          return done(null, savedUser);
        } catch (error) {
          console.error('Error in Google Strategy:', error);
          return done(error, null);
        }
      }
    )
  );
  } else {
    console.log('Google OAuth not configured - using development mode');
  }

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
