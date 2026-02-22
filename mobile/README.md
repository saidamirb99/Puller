# Puller Mobile App

React Native mobile app for Puller Personal Finance Management.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Installation

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Configure backend connection:
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and replace 192.168.1.100 with your computer's local IP
# Find your IP:
# - Mac/Linux: ifconfig | grep "inet "
# - Windows: ipconfig
```

3. Start the development server:
```bash
npm start
```

4. Scan the QR code:
- **iOS**: Open Camera app and scan the QR code
- **Android**: Open Expo Go app and scan the QR code

## 📱 Testing on Your Phone

### Step 1: Start Backend API
In a separate terminal:
```bash
cd ../backend
python src/main.py
```
Backend will run at `http://localhost:8000`

### Step 2: Find Your Local IP
Your phone needs to connect to your computer's backend API.

**Mac/Linux:**
```bash
ifconfig | grep "inet "
# Look for something like: inet 192.168.1.100
```

**Windows:**
```bash
ipconfig
# Look for IPv4 Address: 192.168.1.100
```

### Step 3: Update Mobile Config
Edit `mobile/.env`:
```
API_BASE_URL=http://YOUR_IP_HERE:8000/api/v1
```
Replace `YOUR_IP_HERE` with the IP from Step 2.

Also update `mobile/src/services/api.ts` line 5 with your IP.

### Step 4: Run the App
```bash
npm start
```
Scan QR code with Expo Go app on your phone.

## 📂 Project Structure

```
mobile/
├── App.tsx                      # Root component
├── app.json                     # Expo configuration
├── package.json
├── src/
│   ├── screens/                 # App screens
│   │   ├── auth/               # Login, Register
│   │   ├── DashboardScreen.tsx
│   │   ├── AccountsScreen.tsx
│   │   ├── TransactionsScreen.tsx
│   │   ├── AnalyticsScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── navigation/              # Navigation setup
│   │   └── AppNavigator.tsx
│   ├── services/                # API services
│   │   ├── api.ts              # Axios instance
│   │   └── auth.service.ts     # Auth API calls
│   ├── contexts/                # React Context
│   │   └── AuthContext.tsx
│   ├── store/                   # Redux store
│   │   └── index.ts
│   └── components/              # Reusable components
```

## 🎨 Features

- ✅ User authentication (login/register)
- ✅ Bottom tab navigation
- ✅ Dashboard with balance overview
- ✅ Accounts management (placeholder)
- ✅ Transactions list (placeholder)
- ✅ Analytics (placeholder)
- ✅ User profile & settings
- 🚧 Real-time balance updates (coming soon)
- 🚧 Charts and visualizations (coming soon)
- 🚧 AI categorization (coming soon)

## 🔧 Development

```bash
# Start development server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator (Mac only)
npm run ios

# Run tests
npm test
```

## 📝 Notes

- Make sure your phone and computer are on the **same WiFi network**
- If connection fails, check firewall settings allow port 8000
- The backend must be running for the app to work
- Use Expo Go app for testing (no build required)

## 🐛 Troubleshooting

**Can't connect to backend:**
- Verify both devices on same WiFi
- Check IP address is correct in .env
- Ensure backend is running (http://localhost:8000/health)
- Try disabling firewall temporarily

**QR code doesn't work:**
- Type the URL manually in Expo Go
- Use tunnel mode: `npx expo start --tunnel`

**App crashes on start:**
- Clear cache: `npx expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
