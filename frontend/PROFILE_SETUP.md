# Profile Management Dashboard Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Access the Profile System
- **Main Profile**: http://localhost:3000/profile
- **Demo Page**: http://localhost:3000/demo

## Features Overview

### 🎯 Profile Management
- Edit personal information
- Upload avatar
- Privacy settings
- Form validation

### 🏆 Achievement System
- Multiple rarity levels
- Progress tracking
- Category filtering
- Search functionality

### 🎓 Credential Management
- Verification status
- Skills tagging
- Document links
- Type organization

### 📊 Statistics Dashboard
- Course metrics
- Study streaks
- Global ranking
- Performance scores

## Component Structure

```
src/
├── app/
│   ├── profile/page.tsx          # Main profile dashboard
│   └── demo/page.tsx              # Interactive demo
├── components/
│   ├── ProfileEditor.tsx          # Profile editing form
│   ├── AchievementDisplay.tsx     # Achievement showcase
│   ├── CredentialList.tsx         # Credential management
│   ├── ProfileStats.tsx           # Statistics dashboard
│   └── Profile/                   # Existing profile components
├── hooks/
│   └── useProfile.ts              # Profile data management
├── types/
│   └── profile.ts                 # TypeScript definitions
└── test-profile.tsx               # Test data and utilities
```

## Data Flow

1. **useProfile Hook** - Central state management
2. **LocalStorage** - Data persistence
3. **Mock Data** - Development environment
4. **Type Safety** - Comprehensive TypeScript types

## Testing

### Run Tests
```bash
npm test
```

### View Test Data
The test file includes sample data for all profile components:
```typescript
import { testProfileData } from './test-profile';
console.log(testProfileData());
```

## Styling

- **Tailwind CSS** for styling
- **Dark Mode** support
- **Responsive** design
- **Lucide React** icons

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Common Issues

1. **Missing Dependencies**
   ```bash
   npm install react-hook-form lucide-react
   ```

2. **TypeScript Errors**
   ```bash
   npm run build
   ```

3. **Development Server Issues**
   ```bash
   npm run dev -- --port 3001
   ```

### Performance Tips

- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Optimize images and assets
- Enable production builds

## Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_ENABLE_MOCK_DATA=true
```

## Contributing

1. Follow existing code patterns
2. Add TypeScript types
3. Include tests
4. Update documentation
5. Ensure responsive design

## Support

For issues or questions:
1. Check the demo page at `/demo`
2. Review component documentation
3. Test with provided sample data
4. Check browser console for errors
