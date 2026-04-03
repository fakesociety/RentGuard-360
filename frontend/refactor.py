import re
import os

with open('src/pages/public/LandingPage.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add import AuthModal
text = text.replace("import { DashboardMockup, ContractsGridMockup, ContractViewerMockup } from './components/Mockups';", "import { DashboardMockup, ContractsGridMockup, ContractViewerMockup } from './components/Mockups';\nimport AuthModal from './components/AuthModal';")

# Remove old states and handlers
start_idx = text.find("    // Auth form state")
end_idx = text.find("    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % benefits.length);")

if start_idx != -1 and end_idx != -1:
    part1 = text[:start_idx]
    part2 = text[end_idx:]
    
    auth_state_replacement = '''    const [authModal, setAuthModal] = useState(() => (getPendingVerificationEmail() ? 'confirm' : null));
    const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Navigation and helpers
    const toggleAuth = (type) => {
        setAuthModal(authModal === type ? null : type);
    };

'''
    text = part1 + auth_state_replacement + part2

# Replace Navbar + Modals section inside return
return_start = text.find("            {/* ===== NAVBAR (use shared Navigation component) ===== */}")
hero_start = text.find("            {/* ===== HERO SECTION ===== */}")

if return_start != -1 and hero_start != -1:
    before_nav = text[:return_start]
    after_hero = text[hero_start:]
    
    new_nav_and_auth = '''            {/* ===== NAVBAR (use shared Navigation component) ===== */}
            <Navigation showAuthControls={!isAuthenticated} onAuthClick={toggleAuth} />

            <AuthModal 
                view={authModal} 
                onChangeView={setAuthModal} 
                onClose={() => setAuthModal(null)} 
            />

'''
    text = before_nav + new_nav_and_auth + after_hero

# Remove Social conflict modal
social_start = text.find("            {/* Social conflict modal for native signup against social-only email */}")
if social_start != -1:
    social_end = text.find("            {/* ===== HERO SECTION ===== */}", social_start)
    if social_end != -1:
        text = text[:social_start] + text[social_end:]

# Remove Verification Success Modal from the bottom
verif_start = text.find("            {showVerificationSuccess && (")
if verif_start != -1:
    # Just trim everything after till the end div and remove it
    verif_end = text.find("            )}", verif_start)
    if verif_end != -1:
        text = text[:verif_start] + text[verif_end+15:]

# Ensure no hanging variables
text = text.replace("    const { login, socialLogin, register, confirmRegistration, isAuthenticated, resendCode, forgotPassword, resetUserPassword, checkUserStatus } = useAuth();", "    const { isAuthenticated } = useAuth();")

with open('src/pages/public/LandingPage.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Refactored LandingPage.jsx')
