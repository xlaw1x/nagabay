
import React, { useEffect, useRef, useState } from 'react';

interface TelemedicineViewProps {
  onEndCall: () => void;
  patientName?: string;
  role?: 'patient' | 'doctor';
}

interface ChatMessage {
  id: string;
  sender: 'doctor' | 'patient';
  senderName: string;
  text: string;
  timestamp: string;
}

const DOCTOR_PORTRAIT = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800";

const TelemedicineView: React.FC<TelemedicineViewProps> = ({ onEndCall, patientName, role = 'patient' }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'doctor',
      senderName: 'Dr. John Bongat',
      text: 'Hello! I am reviewing your intake notes. How are you feeling today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    startCamera();

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    // FIX: Added explicit cast to 'doctor' | 'patient' to resolve the 'string' assignment error.
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: role as 'doctor' | 'patient',
      senderName: role === 'doctor' ? 'Dr. John Bongat' : (patientName || 'Patient'),
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setChatInput('');

    // Simulate auto-reply from other side for demo purposes if needed
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-[150] flex animate-fadeIn overflow-hidden">
      {/* Main Video Area */}
      <div className={`flex-1 relative flex flex-col transition-all duration-500 ${isChatOpen ? 'mr-0 md:mr-80' : 'mr-0'}`}>
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-naga-purple flex items-center justify-center text-white shadow-lg">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div>
              <h2 className="text-white font-black uppercase tracking-widest text-xs">Secure Naga-TeleLink</h2>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-tighter">Encrypted Clinical Session</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
            <p className="text-white font-mono text-sm font-black">{formatTime(callDuration)}</p>
          </div>
        </div>

        {/* Video Content */}
        <div className="flex-1 relative">
          <div className="w-full h-full bg-slate-800 flex items-center justify-center overflow-hidden">
            {role === 'patient' ? (
              <div className="relative w-full h-full flex items-center justify-center">
                 <img src={DOCTOR_PORTRAIT} alt="Doctor" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-black/20"></div>
                 <div className="absolute bottom-32 left-8">
                    <div className="bg-naga-purple/90 backdrop-blur-sm text-white px-5 py-2.5 rounded-2xl shadow-2xl border border-white/10 animate-fadeIn">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5">Attending Physician</p>
                      <p className="text-sm font-black uppercase">Dr. John Bongat (CHO I)</p>
                    </div>
                 </div>
              </div>
            ) : (
              <div className="text-center">
                 <div className="w-24 h-24 rounded-full bg-slate-700 mx-auto mb-4 flex items-center justify-center text-white text-3xl">
                    <i className="fa-solid fa-user"></i>
                 </div>
                 <p className="text-white font-black uppercase tracking-widest">{patientName || 'Patient'}</p>
                 <p className="text-white/40 text-xs mt-1 italic">Waiting for camera feed...</p>
              </div>
            )}
          </div>

          {/* Local Video (Floating) */}
          <div className={`absolute top-24 transition-all duration-500 ${isChatOpen ? 'right-6' : 'right-8'} w-32 h-48 md:w-40 md:h-56 bg-black rounded-[2rem] border-2 border-white/20 shadow-2xl overflow-hidden group`}>
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              className={`w-full h-full object-cover transform scale-x-[-1] ${isVideoOff ? 'hidden' : ''}`} 
            />
            {isVideoOff && (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
                <i className="fa-solid fa-video-slash text-2xl mb-2"></i>
                <span className="text-[8px] font-black uppercase">Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="bg-black/40 backdrop-blur-md text-white text-[8px] font-black uppercase px-2 py-1 rounded-full">You</span>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="p-8 pb-12 flex justify-center items-center gap-4 md:gap-6 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-lg md:text-xl transition-all hover:scale-110 active:scale-95 ${isMuted ? 'bg-red-500 text-white border-transparent' : 'bg-white/10 text-white border border-white/20'}`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>
          
          <button 
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-lg md:text-xl transition-all hover:scale-110 active:scale-95 ${isVideoOff ? 'bg-red-500 text-white border-transparent' : 'bg-white/10 text-white border border-white/20'}`}
            title={isVideoOff ? "Start Camera" : "Stop Camera"}
          >
            <i className={`fa-solid ${isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
          </button>

          <button 
            onClick={onEndCall}
            className="w-16 h-16 md:w-20 md:h-20 rounded-[2.5rem] bg-rose-600 text-white flex items-center justify-center text-2xl md:text-3xl shadow-2xl shadow-rose-600/40 hover:bg-rose-700 hover:scale-105 active:scale-90 transition-all border-4 border-white/10"
            title="End Call"
          >
            <i className="fa-solid fa-phone-slash"></i>
          </button>

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-lg md:text-xl transition-all hover:scale-110 active:scale-95 relative ${isChatOpen ? 'bg-naga-purple text-white border-transparent' : 'bg-white/10 text-white border border-white/20'}`}
            title="Chat"
          >
            <i className="fa-solid fa-comment-dots"></i>
            {!isChatOpen && <span className="absolute top-0 right-0 w-3 h-3 bg-naga-orange border-2 border-slate-900 rounded-full"></span>}
          </button>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className={`fixed right-0 top-0 bottom-0 w-full md:w-80 bg-slate-800/95 backdrop-blur-xl border-l border-white/10 flex flex-col transition-transform duration-500 z-50 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-sm">Consultation Chat</h3>
            <p className="text-[10px] text-emerald-500 font-bold uppercase">Encrypted</p>
          </div>
          <button 
            onClick={() => setIsChatOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === role ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${msg.sender === role ? 'bg-naga-purple text-white rounded-tr-none' : 'bg-slate-700 text-white rounded-tl-none border border-white/5'}`}>
                <p className="leading-relaxed font-medium">{msg.text}</p>
              </div>
              <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">
                {msg.senderName} • {msg.timestamp}
              </span>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-900/50">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-slate-700/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-naga-purple transition-all"
            />
            <button 
              type="submit"
              disabled={!chatInput.trim()}
              className="w-10 h-10 rounded-xl bg-naga-purple text-white flex items-center justify-center shadow-lg disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
            >
              <i className="fa-solid fa-paper-plane text-xs"></i>
            </button>
          </form>
          <p className="text-[8px] text-center text-slate-600 font-bold uppercase mt-3 tracking-widest">Only you and the doctor can see this</p>
        </div>
      </div>
    </div>
  );
};

export default TelemedicineView;
