# Finance App

## Overview
This is a React Native Expo application that provides financial management features such as savings, loans, referrals, and user profile management. The app uses React Navigation for screen transitions and authentication context to manage user login state.

## Features
- User authentication (Login & Registration)
- Profile management
- Savings management
- Loan tracking
- Referral system
- Secure authentication using Context API

## Tech Stack
- **Frontend:** React Native, React Navigation
- **Backend:** Supabase (or any API service)
- **State Management:** Context API

## Folder Structure
```
finance-app/
│-- android/
│-- assets/
│-- context/
│   ├── AuthContext.js
│-- lib/
│-- navigation/
│   ├── AppNavigator.js
│-- screens/
│   ├── LoginScreen.js
│   ├── RegistrationScreen.js
│   ├── ProfileScreen.js
│   ├── SavingsScreen.js
│   ├── LoansScreen.js
│   ├── ReferralsScreen.js
│-- App.tsx
│-- package.json
│-- tsconfig.json
│-- README.md
```

## Installation
### Prerequisites
- Node.js & npm/yarn installed
- Android Studio or Xcode for mobile testing
- React Native CLI or Expo CLI

### Steps
1. Clone the repository:
   ```sh
   git clone https://github.com/itsobby/finance-app.git
   cd finance-app
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
   or
   ```sh
   yarn install
   ```
3. Start the Metro bundler:
   ```sh
   npx expo start
   ```
4. Run the app on an emulator or device:
   ```sh
   npx expo run-android  # For Android
   npx expo run-ios      # For iOS
   ```

## Authentication Flow
- Users start at the login screen.
- If authenticated, they navigate to the profile and other financial features.
- Auth state is managed using `AuthContext`.

## Troubleshooting
### Navigation Errors
If you see an error like:
```
The action 'NAVIGATE' with payload {"name":"Profile"} was not handled by any navigator.
```
- Ensure `ProfileScreen.js` is correctly imported and registered in `AppNavigator.js`.
- Confirm `AuthProvider` wraps `AppNavigator` in `App.tsx`.
- Check `navigation.navigate('Profile')` is only called when `isLoggedIn` is `true`.

### Emulator Issues
If the emulator is offline, restart ADB:
```sh
adb kill-server
adb start-server
adb devices
```

## Contribution
1. Fork the repository.
2. Create a new branch (`feature-branch-name`).
3. Commit and push changes.
4. Open a pull request.

## License
MIT License.

