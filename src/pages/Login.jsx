import React, { useState, useEffect, useRef } from 'react';
import { Shield, Terminal, AlertCircle, Fingerprint, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const InteractiveBackground = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId;
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    const particlesArray = [];
    const particleCount = 50;
    
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        // Changed color to yellow theme
        this.color = `rgba(253, 224, 71, ${Math.random() * 0.8})`;
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.x > canvas.width) this.x = 0;
        else if (this.x < 0) this.x = canvas.width;
        
        if (this.y > canvas.height) this.y = 0;
        else if (this.y < 0) this.y = canvas.height;
      }
      
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    const init = () => {
      for (let i = 0; i < particleCount; i++) {
        particlesArray.push(new Particle());
      }
    };
    
    const connect = () => {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            // Changed connection color to yellow theme
            ctx.strokeStyle = `rgba(253, 224, 71, ${0.1 - distance/1000})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    };
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      
      connect();
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    init();
    animate();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10"
    />
  );
};

function Login() {
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Place your finger on the scanner');
  const navigate = useNavigate();
  const progressInterval = useRef(null);

  const startGoogleAuth = async () => {
    if (scanning) return;
    
    setScanning(true);
    setProgress(0);
    setMessage('Scanning...');
    setError(null);

    return new Promise((resolve) => {
      progressInterval.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          
          if (newProgress === 35) {
            setMessage('Analyzing fingerprint pattern...');
          } else if (newProgress === 65) {
            setMessage('Preparing Google authentication...');
          } else if (newProgress === 90) {
            setMessage('Initializing secure connection...');
          } else if (newProgress >= 100) {
            clearInterval(progressInterval.current);
            resolve();
            return 100;
          }
          
          return newProgress;
        });
      }, 100);
    });
  };

  const handleGoogleLogin = async () => {
    try {
      await startGoogleAuth();
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/home');
    } catch (error) {
      console.error("Error signing in with Google: ", error);
      setError("Failed to sign in. Please try again.");
    } finally {
      setScanning(false);
      setProgress(0);
      setMessage('Place your finger on the scanner');
    }
  };

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white flex flex-col items-center justify-center p-4 relative font-mono">
      <InteractiveBackground />
      
      {/* Added glowing effects matching other pages */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-10 bg-yellow-600 blur-[80px]"></div>
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] rounded-full opacity-10 bg-yellow-600 blur-[80px]"></div>
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[300px] rounded-full opacity-10 bg-yellow-600 blur-[80px]"></div>
      </div>
      
      <div className="absolute top-4 left-4 flex items-center text-yellow-400 z-10">
        <Terminal className="w-5 h-5 mr-2" />
        <span className="text-sm font-mono">CID v4.2.1</span>
      </div>
      
      <div className="w-full max-w-md md:max-w-lg bg-black/50 backdrop-blur-lg rounded-xl shadow-2xl border border-yellow-700/30 p-6 md:p-8 relative z-10 overflow-hidden">
        {/* Terminal-like header bar */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-black/80 flex items-center px-3 border-b border-yellow-700/30">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="text-xs text-yellow-400/70 mx-auto font-mono">CID Secure Terminal</div>
        </div>
        
        <div className="mt-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-black/50 rounded-full border-2 border-yellow-400 mb-4 relative overflow-hidden">
              <Shield className="text-yellow-400 w-10 h-10" />
              <div className="absolute w-full h-1 bg-yellow-400 opacity-70 animate-scan" />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2 tracking-wider">
              CID-CTF LOGIN
            </h1>
            
            <div className="flex items-center justify-center text-red-400 animate-pulse mb-4">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p className="text-sm md:text-base font-semibold tracking-wide">
                SECURITY CLEARANCE REQUIRED
              </p>
              <AlertCircle className="w-5 h-5 ml-2" />
            </div>
          </div>
          
          <div className="flex flex-col items-center p-4">
            <div 
              onClick={handleGoogleLogin}
              className={`
                w-40 h-40 rounded-full flex items-center justify-center cursor-pointer 
                relative overflow-hidden transition-all duration-300
                ${scanning 
                  ? 'bg-black border-4 border-yellow-400 shadow-[0_0_30px_rgba(253,224,71,0.7)]' 
                  : 'bg-black/70 border-2 border-yellow-400 shadow-[0_0_15px_rgba(253,224,71,0.3)] hover:shadow-[0_0_20px_rgba(253,224,71,0.5)]'}
              `}
            >
              {scanning ? (
                <>
                  <Loader className="w-16 h-16 text-yellow-400 animate-spin" />
                  <div className="absolute w-full h-1.5 bg-yellow-400 opacity-70 top-0 animate-scan"></div>
                </>
              ) : (
                <Fingerprint className="w-20 h-20 text-yellow-400 opacity-80" />
              )}
            </div>
            
            {scanning && (
              <div className="w-full mt-6 mb-2">
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            
            <p className={`mt-4 text-center ${scanning ? 'text-yellow-400' : 'text-yellow-400/70'}`}>
              {message}
            </p>

            {error && (
              <p className="mt-4 text-red-500 text-sm">{error}</p>
            )}
          </div>
          
          <div className="mt-8 text-center text-xs text-yellow-400/50">
            <div className="flex flex-col items-center space-y-2">
              <p>
                This portal is protected by CID Intelligence Division.
              </p>
              <p>
                Unauthorized access attempts will be prosecuted to the full extent of the law.
              </p>
              <div className="flex items-center mt-2">
                <Shield className="w-3 h-3 mr-1" />
                <span>CID Security Protocol v4.2.1</span>
                <Shield className="w-3 h-3 ml-1" />
              </div>
            </div>
            
            <div className="mt-4 pt-2 border-t border-yellow-700/30">
              <div className="flex items-center justify-center">
                <div className="h-1 w-1 bg-yellow-500 rounded-full mr-1 animate-ping"></div>
                <div className="h-1 w-1 bg-yellow-500 rounded-full mr-1"></div>
                <span className="text-yellow-400">
                  © {new Date().getFullYear()} Criminal Investigation Department. All rights reserved.
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Police tape effect at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-4" style={{
          background: 'repeating-linear-gradient(45deg, yellow, yellow 10px, black 10px, black 20px)',
          opacity: 0.5
        }}></div>
      </div>
    </div>
  );
}

export default Login;