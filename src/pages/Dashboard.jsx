import { useRef,useState, useEffect } from 'react';
import { Search, FileText, Lock, AlertCircle, Clock, ArrowRight, VolumeX, Volume2 } from 'lucide-react';


export default function Dashboard() {
  const [isTyping, setIsTyping] = useState(true);
  const [text, setText] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [hoverButton, setHoverButton] = useState(false);
  const fullText = "Solve the Mystery, Capture the Flag.";
  const audioRef = useRef(null);
  useEffect(() => {
    if (isTyping) {
      const nextChar = fullText.charAt(text.length);
      if (text.length < fullText.length) {
        const timeout = setTimeout(() => {
          setText(text + nextChar);
        }, 100);
        return () => clearTimeout(timeout);
      } else {
        setIsTyping(false);
        setTimeout(() => {
          setIsTyping(true);
          setText("");
        }, 5000);
      }
    }
  }, [text, isTyping]);
 
  //background audio
  useEffect(() => {
    if (soundEnabled) {
      audioRef.current.play().catch((e) => {
        console.error("Audio play failed:", e);
      });
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Rewind when turned off
    }
  }, [soundEnabled]);


  return (
    <div className="min-screen bg-gray-900 text-gray-200 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-16 bg-yellow-400 rotate-12 translate-y-24 translate-x-16">
          POLICE LINE DO NOT CROSS POLICE LINE DO NOT CROSS
        </div>
        <div className="absolute bottom-0 right-0 w-full h-16 bg-yellow-400 -rotate-12 -translate-y-24 -translate-x-16">
          POLICE LINE DO NOT CROSS POLICE LINE DO NOT CROSS
        </div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 border-2 border-red-600 rounded-full opacity-20"></div>
        <div className="absolute top-1/3 right-1/4 w-32 h-32 border border-blue-500 opacity-30 transform rotate-45"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-8 flex justify-between items-center border-b border-gray-800">
        <div className="flex items-center">
          <AlertCircle className="text-red-500 mr-2" />
          <h1 className="font-mono text-xl tracking-tighter font-bold text-red-500">CID:<span className="text-blue-400">CTF</span></h1>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#" className="font-mono text-sm hover:text-red-500 transition duration-300">MISSIONS</a>
          <a href="/leaderboard" className="font-mono text-sm hover:text-red-500 transition duration-300">LEADERBOARD</a>
          <a href="#" className="font-mono text-sm hover:text-red-500 transition duration-300">EVIDENCE</a>
          <a href="#" className="font-mono text-sm hover:text-red-500 transition duration-300">CONTACT</a>
          <div 
            className="cursor-pointer"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 size={18} className="text-green-500" /> : <VolumeX size={18} />}
          </div>
          <audio ref={audioRef} loop>
        <source src="/cid_audio.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
        </nav>
        
        <div className="md:hidden">
          <div className="w-6 h-0.5 bg-gray-400 mb-1.5"></div>
          <div className="w-6 h-0.5 bg-gray-400 mb-1.5"></div>
          <div className="w-6 h-0.5 bg-gray-400"></div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 py-16 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-4xl bg-gray-950 border border-gray-800 p-8 relative shadow-xl">
          {/* Top Secret Stamp */}
          <div className="absolute -top-4 -right-4 bg-red-600 text-white px-4 py-1 transform rotate-12 font-bold text-sm font-mono shadow-lg">
            TOP SECRET
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-3/5">
              <h4 className="text-gray-500 font-mono mb-2 flex items-center">
                <Clock size={16} className="mr-2" />
                CASE FILE: <span className="text-green-500 ml-2">#XJ-274-B</span>
              </h4>
              
              <h2 className="font-mono text-4xl md:text-5xl mb-6 text-white relative">
                <span className="relative">
                  {text}
                  <span className="absolute right-0 top-0 h-full w-2 bg-green-500 animate-pulse"></span>
                </span>
              </h2>
              
              <p className="text-gray-400 mb-8 max-w-lg">
                Enter a world of digital forensics, cryptography, and criminal investigation. 
                Your analytical skills will be tested. Your ability to find hidden clues will be challenged.
                Do you have what it takes to decode the evidence and capture all flags?
              </p>
              
              <div className="mb-8 flex items-center">
                <div 
                  className={`relative inline-flex items-center px-6 py-3 bg-gray-900 text-white font-mono 
                    border-2 ${hoverButton ? 'border-red-500' : 'border-green-500'} cursor-pointer group overflow-hidden`}
                  onMouseEnter={() => setHoverButton(true)}
                  onMouseLeave={() => setHoverButton(false)}
                >
                  <span className={`relative z-10 flex items-center ${hoverButton ? 'text-red-500' : 'text-green-500'}`}>
                    START INVESTIGATION <ArrowRight size={18} className="ml-2" />
                  </span>
                  <span className={`absolute bottom-0 left-0 w-full h-0 ${hoverButton ? 'bg-red-900/20' : 'bg-green-900/20'} transition-all duration-300 group-hover:h-full`}></span>
                </div>
                
                <div className="ml-4 font-mono text-xs text-gray-500 flex items-center">
                  <Lock size={14} className="mr-1" /> 
                  <span className="hidden md:inline">SECURITY CLEARANCE REQUIRED</span>
                  <span className="md:hidden">SECURE</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <div className="px-3 py-1 bg-gray-800 text-xs font-mono text-blue-400 flex items-center">
                  <Search size={12} className="mr-1" />
                  CRYPTOGRAPHY
                </div>
                <div className="px-3 py-1 bg-gray-800 text-xs font-mono text-green-400 flex items-center">
                  <FileText size={12} className="mr-1" />
                  FORENSICS
                </div>
                <div className="px-3 py-1 bg-gray-800 text-xs font-mono text-red-400 flex items-center">
                  <AlertCircle size={12} className="mr-1" />
                  STEGANOGRAPHY
                </div>
              </div>
            </div>
            
            <div className="md:w-2/5 bg-gray-900 border border-gray-800 p-4 relative">
              <div className="text-xs font-mono text-gray-500 mb-2">LATEST INTELLIGENCE</div>
              <div className="space-y-3">
                {[1, 2, 3].map(index => (
                  <div key={index} className="p-3 bg-gray-950 border-l-2 border-blue-500">
                    <div className="text-gray-400 text-sm mb-1 font-mono flex justify-between">
                      <span>CASE #{10 + index}</span>
                      <span className="text-green-500">OPEN</span>
                    </div>
                    <div className="text-sm">
                      {index === 1 ? "Digital fingerprints discovered in corrupted file. Requires hex analysis." : 
                       index === 2 ? "Encrypted message intercepted from suspect. Decryption key needed." :
                       "Evidence hidden in network packets. Analyze the traffic capture."}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Flickering Element */}
              <div className="absolute -bottom-3 -right-3 px-2 py-1 bg-red-600 text-white text-xs font-mono animate-pulse">
                LIVE UPDATES
              </div>
            </div>
          </div>
        </div>
        
        {/* Crime Scene Silhouette */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-black opacity-30 z-0">
          <div className="w-full h-full relative">
            <div className="absolute left-1/4 bottom-0 w-32 h-8 bg-gray-600"></div>
            <div className="absolute left-1/4 bottom-8 w-10 h-16 bg-gray-600"></div>
            <div className="absolute left-1/4 translate-x-10 bottom-8 w-10 h-12 bg-gray-600"></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 py-4 px-8">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <div>© 2025 CID:CTF • All rights reserved</div>
          <div className="font-mono">EVIDENCE DATABASE: <span className="text-green-500">ONLINE</span></div>
        </div>
      </footer>
      
      {/* Overlay Screen Effect */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-blue-900/5 to-gray-900/5 z-20"></div>
      <div className="pointer-events-none fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjMDAwIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDVMNSAwWk02IDRMNCA2Wk0tMSAxTDEgLTFaIiBzdHJva2U9IiMyMjIiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8L3N2Zz4=')] opacity-5 z-30"></div>
    </div>
  );
}