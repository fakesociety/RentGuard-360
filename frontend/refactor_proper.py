import re
import os

filepath = 'src/pages/public/LandingPage.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add import AuthModal
text = text.replace("import { DashboardMockup, ContractsGridMockup, ContractViewerMockup } from './components/Mockups';", 
                    "import { DashboardMockup, ContractsGridMockup, ContractViewerMockup } from './components/Mockups';\nimport AuthModal from './components/AuthModal';")

# 2. Extract state chunk to replace
start_str = "    const getPendingVerificationEmail = () => {"
end_str = "    // Carousel auto-advance"

if start_str in text and end_str in text:
    part1 = text.split(start_str)[0]
    part2_start = text.find(end_str)
    part2 = text[part2_start:]
    
    replacement = '''    const getPendingVerificationEmail = () => {
        try {
            return localStorage.getItem('rentguard_pending_verification') || '';
        } catch {
            return '';
        }
    };

    const [authModal, setAuthModal] = useState(() => (getPendingVerificationEmail() ? 'confirm' : null));
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
    text = part1 + replacement + part2

# 3. Replace the Navbar and Auth rendering
nav_str = "            {/* ===== NAVBAR (use shared Navigation component) ===== */}"
hero_str = "            {/* ===== HERO SECTION ===== */}"

if nav_str in text and hero_str in text:
    part1_nav = text.split(nav_str)[0]
    part2_nav_start = text.find(hero_str)
    part2_nav = text[part2_nav_start:]

    new_nav = '''            {/* ===== NAVBAR (use shared Navigation component) ===== */}
            <Navigation showAuthControls={!isAuthenticated} onAuthClick={toggleAuth} />

            <AuthModal 
                view={authModal} 
                onChangeView={setAuthModal} 
                onClose={() => setAuthModal(null)} 
            />

'''
    text = part1_nav + new_nav + part2_nav

# 4. Remove showVerificationSuccess modal at the bottom exactly
verif_start = "            {showVerificationSuccess && ("
verif_end = "            )}\n        </div>"

if verif_start in text and verif_end in text:
    part1_verif = text.split(verif_start)[0]
    part2_verif_start = text.find(verif_end) + len("            )}")
    part2_verif = text[part2_verif_start:]
    text = part1_verif + part2_verif

# clean up useAuth call
text = re.sub(r"const \{ .*? \} = useAuth\(\);", "const { isAuthenticated } = useAuth();", text)

# clean up unused imports from UI
text = text.replace("import Button from '../../components/ui/Button';\n", "")
text = text.replace("import Input from '../../components/ui/Input';\n", "")
text = text.replace("import { X, Cloud, Bot, Lock, Zap, Pause, CheckCircle } from 'lucide-react';", 
                    "import { Cloud, Bot, Lock, Zap, Pause, CheckCircle } from 'lucide-react';")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print("Done")
