# RentGuard 360 🛡️

**AI-Powered Lease Analysis & Negotiation Platform**

RentGuard 360 is a cloud-native serverless application that empowers renters in Israel with instant AI-powered contract analysis, risk assessment, and negotiation coaching.

---

## 🎯 Project Overview

### Team: AI-Lawyers
- **Ron Blanki**  - Frontend & Integration
- **Moti Sahartov**  - Backend & Infrastructure

### Academic Context
Cloud Computing Final Project | Submission Deadline: January 10, 2026

---

## 🚀 Features

- **📄 PDF Contract Upload** - Drag-and-drop interface for lease agreements
- **🤖 AI Analysis** - Powered by Amazon Bedrock (Claude 3)
- **⚠️ Risk Assessment** - Visual indicators for problematic clauses
- **💡 Negotiation Coach** - AI-generated alternative clause suggestions
- **🔒 Privacy Shield** - Automatic PII detection and removal
- **📊 Contract Benchmark** - Comparison to standard Israeli leases
- **👥 Role-Based Access** - Admin and User permissions
- **📱 Responsive Design** - iOS 26 Liqueed style with dark/light modes

---

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Auth**: AWS Amplify (Cognito)
- **Design**: iOS 26 Liqueed style (Custom CSS)

### Backend (AWS Serverless)
- **Compute**: AWS Lambda (Python 3.11)
- **API**: Amazon API Gateway (REST)
- **AI**: Amazon Bedrock (Claude 3 Sonnet)
- **Workflow**: AWS Step Functions
- **Storage**: Amazon S3
- **Database**: Amazon DynamoDB
- **Auth**: Amazon Cognito
- **CDN**: CloudFront + WAF
- **Notifications**: Amazon SNS

---

## 📁 Project Structure

```
RentGuard-360/
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── styles/          # Design system CSS
│   │   ├── utils/           # Helper functions
│   │   └── App.jsx          # Main app component
│   └── package.json
├── backend/                 # AWS Lambda functions
│   ├── lambdas/
│   │   ├── pdf-processor/   # PDF text extraction
│   │   ├── privacy-shield/  # PII sanitization
│   │   ├── ai-analyzer/     # Bedrock integration
│   │   └── api-handlers/    # CRUD operations
│   └── step-functions/      # Workflow definitions
├── infrastructure/          # IaC and deployment scripts
│   ├── cloudformation/      # AWS CloudFormation templates
│   └── scripts/             # Setup and deployment scripts
└── docs/                    # Project documentation
    ├── architecture/        # Architecture diagrams
    ├── user-manual/         # End-user guide
    ├── admin-manual/        # Admin guide
    └── api-documentation/   # API reference
```

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js** 20.19+ or 22.12+
- **npm** 10.8+
- **AWS CLI** configured
- **Git** 2.40+

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

### Backend Setup

See [infrastructure/README.md](infrastructure/README.md) for AWS deployment instructions.

---

## 🎨 Design System

The project uses a custom **iOS 26 Liqueed-inspired design system** featuring:

- **Glassmorphism effects** with backdrop blur
- **Smooth animations** (spring physics)
- **Dark/Light mode** with automatic system detection
- **Neutral color palette** suitable for legal applications
- **Accessibility** compliant (WCAG 2.1 AA)

### Components

- `<Button />` - Primary, secondary, ghost, danger variants
- `<Card />` - Elevated, outlined, glass variants
- `<Input />` - Form inputs with error states
- `<Toggle />` - iOS-style switch with theme support

---

## 📦 Available Scripts

### Frontend

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

### Backend

```bash
# In each Lambda directory
pip install -r requirements.txt -t .
zip -r function.zip .
aws lambda update-function-code --function-name <name> --zip-file fileb://function.zip
```

---

## 🔐 Environment Variables

Create `.env` file in frontend directory:

```env
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=<your-cognito-user-pool-id>
VITE_USER_POOL_CLIENT_ID=<your-cognito-client-id>
VITE_API_ENDPOINT=<your-api-gateway-url>
```

---

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend Lambda tests
cd backend/lambdas/pdf-processor
pytest
```

---

## 📝 Documentation

- [Implementation Plan](docs/implementation_plan.md)
- [Week 1 Action Plan](docs/week1_action_plan.md)
- [GitHub Workflow Guide](docs/github_workflow_guide.md)
- [Architecture Documentation](docs/architecture/)

---

## 🤝 Contributing

### Branch Strategy

- `main` - Production-ready code
- `dev` - Development integration
- `feature/*` - Feature branches
- `fix/*` - Bug fixes

### Commit Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

---

## 📊 Cost Estimation

**Monthly Estimated Cost**: ~$150-200 USD

Based on:
- 1,000 active users/month
- 5,000 contract analyses/month
- 10GB S3 storage
- 20,000 Lambda invocations

See detailed breakdown in `docs/cost-estimation.pdf`

---

## 🏆 Professor Requirements Checklist

- [x] Frontend + Backend implementation
- [x] Authentication (Cognito with Admin/User groups)
- [x] Serverless architecture
- [x] Real-world problem solution
- [ ] Architecture diagram (A4 with AWS icons)
- [ ] UI/UX design documentation
- [ ] Feature list & UML sequence diagrams
- [ ] AWS cost calculator report
- [ ] User manual
- [ ] Admin manual
- [ ] API documentation
- [ ] Deployment instructions
- [ ] Live demo URL
- [ ] Test credentials

---

## 📅 Timeline

- **Week 1-2**: Setup & Foundation ← **Current Phase**
- **Week 3-4**: Core Features Development
- **Week 5-6**: AI Integration & UI
- **Week 7-8**: Testing & Documentation
- **Week 9**: Integration & Bug Fixes
- **Week 10**: Final Deliverables

---

## 📜 License

This project is created for academic purposes as part of a Cloud Computing course.

---

## 👥 Contact

- **Ron Blanki**: [GitHub](https://github.com/RonPiece)
- **Moti Sahartov**: [GitHub Profile]

---

**Built with ❤️ by the AI-Lawyers Team**
