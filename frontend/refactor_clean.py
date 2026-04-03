import re
import os

with open('src/pages/public/LandingPage.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add import AuthModal
text = text.replace("import { DashboardMockup, ContractsGridMockup, ContractViewerMockup } from './components/Mockups';", 
                    "import { DashboardMockup, ContractsGridMockup, ContractViewerMockup } from './components/Mockups';\nimport AuthModal from './components/AuthModal';")

start_idx = text.find("    // Auth form state")
end_idx = text.find("    const nextSlide = () =>")

if start_idx != -1 and end_idx != -1:
    auth_state_replacement = '''    const [authModal, setAuthModal] = useState(() => (getPendingVerificationEmail() ? 'confirm' : null));
    const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const toggleAuth = (type) => {
        const pendingEmail = localStorage.getItem('rentguard_pending_verification');
        if (type === 'register' && pendingEmail) {
            setAuthModal('confirm');
            return;
        }
        setAuthModal(authModal === type ? null : type);
    };

'''
    text = text[:start_idx] + auth_state_replacement + text[end_idx:]

# Replace navbar
nav_start = text.find("            {/* ===== NAVBAR (use shared Navigation component) ===== */}")
hero_start = text.find("            {/* ===== HERO SECTION ===== */}")

if nav_start != -1 and hero_start != -1:
    new_nav = '''            {/* ===== NAVBAR (use shared Navigation component) ===== */}
            <Navigation showAuthControls={!isAuthenticated} onAuthClick={toggleAuth} />

            <AuthModal 
                view={authModal} 
                onChangeView={setAuthModal} 
                onClose={() => setAuthModal(null)} 
            />

'''
    text = text[:nav_start] + new_nav + text[hero_start:]

# Remove auth backdrop code safely
text = re.sub(r"            \{authModal && \([\s\S]*?            \}\)\n\n", "", text)
text = re.sub(r"            \{showSocialConflictModal && \([\s\S]*?            \}\)\n\n", "", text)
text = re.sub(r"            \{showVerificationSuccess && \([\s\S]*?            \}\)\n", "", text)

# cleanup unused imports
text = text.replace("import Button from '../../components/ui/Button';", "")
text = text.replace("import Input from '../../components/ui/Input';", "")
text = text.replace("import { X, Cloud, Bot, Lock, Zap, Pause, CheckCircle } from 'lucide-react';", 
                    "import { Cloud, Bot, Lock, Zap, Pause, CheckCircle } from 'lucide-react';")

# fix useAuth
text = re.sub(r"const \{ .*? \} = useAuth\(\);", "const { isAuthenticated } = useAuth();", text)
# remove unused states/refs
text = re.sub(r"    const dropdownRef.*?\n", "", text)
text = re.sub(r"    const \[email, setEmail\].*?\n", "", text)

with open('src/pages/public/LandingPage.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
