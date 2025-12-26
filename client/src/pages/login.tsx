import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  Stethoscope, 
  Shield, 
  Clock, 
  Users, 
  Activity,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { SiGoogle } from "react-icons/si";

const features = [
  { icon: Shield, title: "HIPAA Compliant", description: "Enterprise-grade security for patient data" },
  { icon: Clock, title: "24/7 Availability", description: "Access your system anytime, anywhere" },
  { icon: Users, title: "Multi-Department", description: "Manage all hospital departments seamlessly" },
  { icon: Activity, title: "Real-time Analytics", description: "Live dashboards and reporting" },
];

const stats = [
  { value: "500+", label: "Hospitals" },
  { value: "1M+", label: "Patients" },
  { value: "99.9%", label: "Uptime" },
  { value: "50+", label: "Countries" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const { login, isLoggingIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleEmailLogin = () => {
    if (!email || !password) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }
    login({ email, password }, {
      onSuccess: () => navigate("/"),
      onError: (err: any) => toast({ title: "Login failed", description: err.message, variant: "destructive" }),
    });
  };

  const handleSocialLogin = (provider: string) => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">MediCare HMS</h1>
              <p className="text-white/70 text-sm">Hospital Management System</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Streamline Your<br />Hospital Operations
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-md">
              The most comprehensive hospital management solution trusted by healthcare institutions worldwide.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-4"
          >
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                <feature.icon className="w-5 h-5 mt-0.5 text-white/90" />
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-white/70">{feature.description}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative z-10"
        >
          <div className="grid grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/60">
            Trusted by leading healthcare institutions worldwide
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">MediCare HMS</h1>
              <p className="text-muted-foreground text-xs">Hospital Management System</p>
            </div>
          </div>

          <Card className="shadow-xl border-0 bg-card/50 backdrop-blur">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>Sign in to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Social Login Options */}
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full gap-2 h-11"
                  onClick={() => handleSocialLogin("google")}
                  data-testid="button-google-login"
                >
                  <SiGoogle className="w-4 h-4 text-[#4285f4]" />
                  Continue with Google
                </Button>
              </div>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                  or continue with
                </span>
              </div>

              {/* Auth Method Tabs */}
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <button
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    authMethod === "email" ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                  onClick={() => setAuthMethod("email")}
                  data-testid="tab-email"
                >
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </button>
                <button
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    authMethod === "phone" ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                  onClick={() => setAuthMethod("phone")}
                  data-testid="tab-phone"
                >
                  <Activity className="w-4 h-4 inline mr-2" />
                  Phone
                </button>
              </div>

              {authMethod === "email" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@hospital.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        data-testid="input-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button 
                        className="text-xs text-primary hover:underline"
                        data-testid="link-forgot-password"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        data-testid="input-password"
                      />
                      <button 
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    onClick={handleEmailLogin} 
                    disabled={isLoggingIn} 
                    className="w-full h-11 gap-2"
                    data-testid="button-login"
                  >
                    {isLoggingIn ? "Signing in..." : "Sign In"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {authMethod === "phone" && (
                <div className="space-y-4 text-center py-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Activity className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">Phone Login Coming Soon</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      SMS verification will be available in a future update.
                      <br />Please use email or social login for now.
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setAuthMethod("email")}
                    data-testid="button-switch-to-email"
                  >
                    Use Email Instead
                  </Button>
                </div>
              )}

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <button 
                  onClick={() => navigate("/signup")} 
                  className="text-primary font-medium hover:underline"
                  data-testid="link-signup"
                >
                  Create account
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="w-4 h-4" />
              <span>SOC 2 Certified</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
