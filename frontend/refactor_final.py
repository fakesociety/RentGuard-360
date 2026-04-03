import re

filepath = r'c:\Users\user\source\repos\RentGuard-360\frontend\src\pages\public\LandingPage.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace Imports
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

# Navbar replace
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

# Verification modal remove string match (since last script it was removed?)
# let's just make sure it's gone
verif_start = text.find("            {showVerificationSuccess && (")
if verif_start != -1:
    verif_end = text.find("            )}", verif_start) + 14
    text = text[:verif_start] + text[verif_end:]

# Unused states clean
text = re.sub(r"const \{ .*? \} = useAuth\(\);", "const { isAuthenticated } = useAuth();", text)

# Unused imports clean
text = text.replace("import Button from '../../components/ui/Button';\n", "")
text = text.replace("import Input from '../../components/ui/Input';\n", "")
text = text.replace("import { X, Cloud, Bot, Lock, Zap, Pause, CheckCircle } from 'lucide-react';", 
                    "import { Cloud, Bot, Lock, Zap, Pause, CheckCircle } from 'lucide-react';")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

with open(r'c:\Users\user\source\repos\RentGuard-360\frontend\done.txt', 'w') as f:
    f.write('done')
