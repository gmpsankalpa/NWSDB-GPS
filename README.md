# NWSDB AquaConnect - Water Connection Management System

A comprehensive web application for managing water connection applications for the National Water Supply and Drainage Board (NWSDB), Dambulla Regional Office.

## 📋 Overview

NWSDB AquaConnect is a modern, real-time water connection management system that streamlines the entire application lifecycle from submission to final connection. The system provides role-based access control, real-time status tracking, QR code generation, customer feedback collection, and comprehensive reporting capabilities.

## ✨ Key Features

### 🔐 Role-Based Access Control
- **Regional Engineer**: Full system access, user management, oversight of all offices
- **Developer**: System monitoring, statistics dashboard, full administrative access
- **Acting Officer**: Office-specific application management and processing

### 📝 Application Management
- Create and track water connection applications
- Real-time status updates with detailed activity logs
- Multi-step workflow: Application Received → Documents Verified → Site Inspection → Estimation Sent → Payment Received → Construction → Connected
- Application rejection with detailed reason tracking
- Delete applications with confirmation
- Office-based access control

### 📊 Advanced Features
- **QR Code Generation**: Automatic QR code creation for each application
- **QR Scanner**: Mobile-friendly scanner for quick application lookup
- **Customer Reviews**: Public feedback system with star ratings
- **Estimation Management**: Detailed cost estimation with installment support
- **Payment Tracking**: Payment slip reference and verification
- **Export Reports**: PDF and Excel export for applications data
- **Advanced Filtering**: Filter by status, office, date range
- **Search**: Real-time search across file numbers, names, and NICs

### 📱 Public Features
- Application status tracking without login
- Customer feedback submission
- Office-wise review display

### 🎨 User Experience
- Responsive design (mobile, tablet, desktop)
- Real-time updates using Firebase Firestore
- Modern UI with Tailwind CSS
- Toast notifications for user actions
- Loading states and error handling
- Smooth animations and transitions

## 🛠 Tech Stack

### Frontend
- **React 19.2.0** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **React Hook Form** - Form validation
- **Lucide React** - Icon library

### Backend & Services
- **Firebase Firestore** - Real-time NoSQL database
- **Firebase Authentication** - User authentication
- **Firebase Hosting** - Web hosting

### Additional Libraries
- **jsPDF** - PDF generation
- **xlsx** - Excel file generation
- **QRCode** - QR code generation
- **html5-qrcode** - QR code scanning
- **react-hot-toast** - Toast notifications
- **date-fns** - Date formatting

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase account
- Git

### Setup Instructions

1. **Clone the repository**
```bash
git clone <repository-url>
cd my-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**

Create a `src/firebase.ts` file with your Firebase configuration:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

setPersistence(auth, browserSessionPersistence);
```

4. **Set up Firestore Database**

Create three collections in Firestore:
- `applications` - Water connection applications
- `users` - User profiles and authentication data
- `customerReviews` - Customer feedback and reviews

5. **Deploy Firestore Rules**

Copy the contents of `firestore.rules` to Firebase Console → Firestore Database → Rules

6. **Deploy Firestore Indexes**

Enable composite indexes in Firebase Console:
- Collection: `customerReviews` - Fields: `office` (ASC), `submittedDate` (DESC)
- Collection: `applications` - Fields: `office` (ASC), `customerId` (ASC)

7. **Configure User Credentials**

Update `src/lib/offices.ts` with your office credentials:

```typescript
export const OFFICE_CREDENTIALS: Record<string, { password: string; office: Office; role: Role }> = {
  "your-email@gmail.com": {
    password: "your-password",
    office: "Your Office",
    role: ROLES.ACTING_OFFICER
  }
};
```

## 🚀 Development

### Start Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

## 🌐 Deployment

### Deploy to Vercel
```bash
npm run vercel-build
```

The project includes a `vercel.json` configuration file for seamless Vercel deployment.

### Deploy to Firebase Hosting
```bash
npm run build
firebase deploy
```

## 📂 Project Structure

```
my-app/
├── src/
│   ├── assets/          # Static assets
│   ├── components/      # Reusable React components
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── Layout.tsx
│   │   └── StatusTimeline.tsx
│   ├── contexts/        # React Context providers
│   │   └── AuthContext.tsx
│   ├── lib/             # Utility functions and constants
│   │   ├── offices.ts   # Office credentials and roles
│   │   └── utils.ts     # Helper functions
│   ├── pages/           # Page components
│   │   ├── ApplicationDetails.tsx
│   │   ├── CustomerReviews.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DeveloperDashboard.tsx
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── QRScanner.tsx
│   │   ├── Reports.tsx
│   │   └── UserManagement.tsx
│   ├── App.tsx          # Main app component with routing
│   ├── firebase.ts      # Firebase configuration
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── public/              # Public static files
├── firestore.rules      # Firestore security rules
├── firestore.indexes.json  # Firestore composite indexes
├── firebase.json        # Firebase configuration
├── vercel.json          # Vercel deployment config
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── package.json         # Project dependencies
```

## 👥 User Roles & Permissions

### Regional Engineer
- View all applications across all offices
- Manage users (create, update, block/unblock)
- Delete applications
- Delete customer reviews
- Export reports (PDF/Excel)
- Full system access

### Developer
- System monitoring dashboard with statistics
- View all applications and users
- Full administrative access
- Manage reviews
- Export reports
- User management

### Acting Officer
- View applications from assigned office only
- Create new applications
- Update application status
- Add notes and documentation
- Process estimations and payments
- Access office-specific reports

## 🔑 Authentication

The system uses Firebase Authentication with email/password. Credentials are stored in `src/lib/offices.ts`:

```typescript
export const ROLES = {
  REGIONAL_ENGINEER: 'Regional Engineer',
  ACTING_OFFICER: 'Acting Officer',
  DEVELOPER: 'Developer'
} as const;
```

### Session Management
- 30-minute inactivity timeout
- Browser session persistence
- Automatic logout on inactivity
- Real-time session tracking

## 📱 Application Workflow

1. **Application Received** - Initial submission
2. **Documents Verified** - Document validation
3. **Site Inspection** - Site assessment
4. **Estimation Sent** - Cost estimation with installment options
5. **Payment Received** - Payment verification
6. **Construction** - Installation in progress
7. **Connected** - Service activated

Applications can be **Rejected** at any stage with detailed reasons.

## 🔍 Validation Rules

### NIC Number
- Old format: 9 digits + V/X (e.g., `123456789V`)
- New format: 12 digits (e.g., `200012345678`)
- Case insensitive

### Phone Number
- Format: 10 digits starting with 0 (e.g., `0712345678`)
- Required for new applications

### Estimation Number
- Format: XX/XX/XXXXX/XXXX/XXXXX
- Example: `42/08/04308/2026/00001`
- Auto-formatted during input

## 🔒 Security Features

### Firestore Rules
- Role-based access control
- User-specific data access
- Public read for reviews and application tracking
- Authenticated write operations
- Admin-only user management

### Authentication
- Email/password authentication
- Session persistence
- Automatic logout on inactivity
- Blocked user prevention

## 📊 Reports & Analytics

### Dashboard Statistics
- Total applications count
- Status breakdown (Pending, Connected, Rejected)
- Office-wise distribution
- Recent applications

### Developer Dashboard
- System-wide statistics
- Total users (active/blocked)
- Application status distribution
- Collection status monitoring

### Export Options
- **PDF Export**: Formatted application reports
- **Excel Export**: Spreadsheet data for analysis
- Filtered exports based on status, office, date range

## 🎨 UI Components

### Responsive Design
- Mobile-first approach
- Tablet and desktop optimized
- Collapsible sidebar navigation
- Modal dialogs for actions

### Design System
- Consistent color palette (NWSDB Blue: #1E3A8A)
- Gradient backgrounds
- Shadow effects
- Smooth transitions

## 🐛 Troubleshooting

### Firebase Initialization Error
- Verify Firebase configuration in `src/firebase.ts`
- Check Firebase project console for correct credentials

### Permission Denied Errors
- Deploy updated Firestore rules to Firebase Console
- Check user roles in `src/lib/offices.ts`
- Verify user authentication status

### Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .vite && npm run dev`
- Check TypeScript errors: `npx tsc --noEmit`

## 📝 Environment Variables

Create a `.env` file for environment-specific configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push to branch: `git push origin feature/your-feature`
5. Create a Pull Request

## 📄 License

This project is proprietary software developed for NWSDB (National Water Supply and Drainage Board).

## 👨‍💻 Development Team

Developed for NWSDB Dambulla Regional Office

## 📞 Support

For support and inquiries:
- Email: support@nwsdb.lk
- Regional Office: Dambulla

## 🔄 Version History

### Version 1.0.0 (February 2026)
- Initial release
- Core application management features
- User management system
- QR code generation and scanning
- Customer feedback system
- Developer dashboard
- Export functionality (PDF/Excel)
- Real-time updates
- Role-based access control

---

**Built with ❤️ for NWSDB - Connecting Communities to Clean Water**
