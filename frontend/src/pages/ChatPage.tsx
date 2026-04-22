import React, { useState, useEffect, useRef } from "react";
import { getChatUsers, getChatHistory, sendChatMessage, getProfile, addChatContact, deleteChatMessage, getUploadSignature, blockUser, unblockUser, getPublicProfile } from "../services/apiService";
import type { ChatUser, ChatMessage, UserProfile, PublicProfile } from "../services/apiService";
import { Link } from "react-router-dom";
import axios from "axios";

// Mock distances and times based on text hashes
function mockDistance(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash << 5) - hash + email.charCodeAt(i);
  return (Math.abs(hash) % 15).toFixed(1);
}

export const ChatPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addContactId, setAddContactId] = useState("");
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Profile Slide-over States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<PublicProfile | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const EMOJIS = ["😀","😂","🥰","😎","🤔","👍","❤️","🎉","🔥","✨","✈️","🏖️","🗺️","🚀"];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getChatUsers();
        setUsers(data);
      } catch (err) {
        console.error("Failed to fetch users");
      }
    };
    
    getProfile().then(setCurrentUser).catch(console.error);
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connectWs = () => {
      const wsUrl = `ws://localhost:8000/ws/chat/${currentUser.email}`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_message") {
            const incomingMsg: ChatMessage = data.message;
            setMessages((prev) => {
              if (!prev.find((m) => (m.id || m._id) === (incomingMsg.id || incomingMsg._id))) {
                return [...prev, incomingMsg];
              }
              return prev;
            });
            setUsers((prev) => prev.map(u => {
              if (u.email === incomingMsg.sender_email || u.email === incomingMsg.receiver_email) {
                return { ...u, last_message_preview: incomingMsg.message_type === "audio" ? "🎤 Voice Note" : incomingMsg.message_type === "image" ? "📸 Image" : incomingMsg.text?.substring(0,30), unread_count: (u.unread_count || 0) + (incomingMsg.sender_email !== currentUser.email ? 1 : 0)};
              }
              return u;
            }));
          } else if (data.type === "delete_message") {
            setMessages((prev) => prev.filter((m) => (m.id || m._id) !== data.message_id));
          } else if (data.type === "status_update") {
            setUsers((prev) => 
               prev.map(u => u.email === data.email ? { ...u, is_online: data.is_online } : u)
            );
            setSelectedUser((prev) => (prev && prev.email === data.email ? { ...prev, is_online: data.is_online } : prev));
          }
        } catch (err) {
          console.error("Failed to parse websocket message", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected. Reconnecting...");
        reconnectTimeout = setTimeout(connectWs, 3000);
      };
    };

    connectWs();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [currentUser]);

  useEffect(() => {
    if (!selectedUser) return;
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const history = await getChatHistory(selectedUser.email);
        setMessages(history);
        setUsers(prev => prev.map(u => u.email === selectedUser.email ? { ...u, unread_count: 0 } : u));
      } catch (err) {
        console.error("Failed to fetch chat history");
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
    // Reset profile view if we switch user
    setIsProfileOpen(false);
    setViewingProfile(null);
  }, [selectedUser]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUser) return;
    const tempText = newMessage;
    setNewMessage("");

    try {
      const msg = await sendChatMessage(selectedUser.email, tempText);
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addContactId.trim()) return;
    setIsAddingContact(true);
    try {
      const newContact = await addChatContact(addContactId.trim());
      setUsers(prev => prev.find(u => u.email === newContact.email) ? prev : [...prev, newContact]);
      setAddContactId("");
      alert("Contact added successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to add contact.");
    } finally {
      setIsAddingContact(false);
    }
  };

  const toggleBlock = async () => {
    if (!selectedUser) return;
    try {
      if (selectedUser.is_blocked) {
        await unblockUser(selectedUser.email);
        setUsers(prev => prev.map(u => u.email === selectedUser.email ? { ...u, is_blocked: false } : u));
        setSelectedUser(prev => prev ? { ...prev, is_blocked: false } : null);
      } else {
        await blockUser(selectedUser.email);
        setUsers(prev => prev.map(u => u.email === selectedUser.email ? { ...u, is_blocked: true } : u));
        setSelectedUser(prev => prev ? { ...prev, is_blocked: true } : null);
      }
      setMenuOpen(false);
    } catch (err: any) {
      alert("Failed: " + err.message);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await deleteChatMessage(msgId);
      setMessages((prev) => prev.filter(m => (m.id || m._id) !== msgId));
    } catch (err: any) {
      alert(err.message || "Failed to delete message");
    }
  };

  const uploadMedia = async (file: File, type: "image" | "audio") => {
    if (!selectedUser) return;
    setIsUploading(true);
    try {
      const { signature, timestamp, api_key } = await getUploadSignature();
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${type === 'image' ? 'image' : 'video'}/upload`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', api_key);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);

      const cloudinaryResponse = await axios.post(uploadUrl, formData);
      const { secure_url } = cloudinaryResponse.data;

      const msg = await sendChatMessage(selectedUser.email, "", type, secure_url);
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload media. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadMedia(e.target.files[0], "image");
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
          uploadMedia(audioFile, "audio");
          
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone", err);
        alert("Microphone permission denied.");
      }
    }
  };

  const loadUserProfile = async () => {
    if (!selectedUser) return;
    setIsProfileOpen(true);
    setIsProfileLoading(true);
    try {
      const data = await getPublicProfile(selectedUser.email);
      setViewingProfile(data);
    } catch (err) {
      console.error("Failed to load user profile", err);
    } finally {
      setIsProfileLoading(false);
    }
  };

  // derived UI helpers
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.location?.toLowerCase().includes(searchQuery.toLowerCase()));
  const unreadCountTotal = users.reduce((acc, u) => acc + (u.unread_count || 0), 0);
  const onlineCountTotal = users.filter(u => u.is_online).length;

  if (currentUser && !currentUser.user_id) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] bg-gray-900 border-t border-gray-800 mt-20 px-4 text-center">
        <div className="w-24 h-24 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-5xl mb-6 shadow-xl border border-indigo-500/30 backdrop-blur-md">🔒</div>
        <h2 className="text-3xl font-bold text-gray-100 mb-3">Chat is Locked</h2>
        <p className="text-gray-400 max-w-md mb-8">To maintain absolute privacy, you need to claim a unique User ID before you can send or receive messages. This acts as your Friend Code.</p>
        <Link to="/profile" className="px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold shadow-lg transition-all">Claim Your ID in Profile</Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#12151c] font-sans mt-20 relative overflow-hidden flex-row">
      
      {/* LEFT SIDEBAR: Contacts */}
      <div className="w-[340px] bg-[#1a1d24] border-r border-[#242731] flex flex-col z-10 shrink-0 shadow-lg relative">
        {/* Header */}
        <div className="p-5 pb-3 shrink-0">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                 <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
             </div>
             <div>
               <h2 className="text-xl font-extrabold text-white tracking-tight leading-none">Wanderchat</h2>
               <p className="text-[11px] text-gray-400 font-medium mt-1">{unreadCountTotal} unread • {onlineCountTotal} online</p>
             </div>
          </div>
          
          <div className="relative group mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search travelers, cities..." 
              className="w-full bg-[#12151c] text-white text-[13px] rounded-full pl-10 pr-4 py-2 focus:outline-none transition-all placeholder-gray-500 font-medium border border-[#242731] focus:border-slate-500"
            />
          </div>

          <form onSubmit={handleAddContact} className="flex gap-2 relative">
             <input type="text" value={addContactId} onChange={(e) => setAddContactId(e.target.value.replace(/[^A-Za-z0-9_]/g, ''))} placeholder="Add friend by ID..." className="flex-1 bg-[#12151c] text-white text-[12px] rounded-full pl-4 pr-3 py-1.5 focus:outline-none transition-all placeholder-gray-500 font-medium border border-[#242731]" />
             <button type="submit" disabled={isAddingContact || !addContactId.trim()} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-[12px] font-bold rounded-full transition-all">Add</button>
          </form>
        </div>
        
        {/* Contact List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar min-h-0 pb-4">
          {filteredUsers.map((u) => {
             const dist = mockDistance(u.email);
            return (
            <div
              key={u.email}
              onClick={() => { setSelectedUser(u); }}
              className={`px-3 py-3 rounded-2xl cursor-pointer transition-all duration-200 flex items-center gap-3 relative group overflow-hidden ${
                selectedUser?.email === u.email ? "bg-[#242731] shadow-md border border-[#2a2e39]" : "bg-transparent hover:bg-[#1f222a] border border-transparent"
              } ${u.is_blocked ? "opacity-50 grayscale hover:grayscale-0" : ""}`}
            >
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-tr from-slate-600 to-slate-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                   {u.profile_picture ? <img src={u.profile_picture} alt="profile" className="w-full h-full object-cover" /> : u.name.substring(0,2).toUpperCase()}
                </div>
                {!u.is_blocked && u.is_online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#f27943] border-[2.5px] border-[#1a1d24] rounded-full shadow-sm"></span>}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`font-bold text-[14px] truncate transition-colors ${selectedUser?.email === u.email ? 'text-white' : 'text-gray-100'}`}>{u.name}</h3>
                  <span className="text-[10px] font-semibold text-gray-500 shrink-0 ml-2">
                     {u.last_message_time ? new Date(u.last_message_time + "Z").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
                   <svg className="w-3 h-3 text-[#f27943]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                   <span className={`text-[11px] font-semibold truncate ${selectedUser?.email === u.email ? 'text-[#FFAF80]' : 'text-[#f27943]'}`}>{u.location || 'Unknown'}</span>
                   <span className="text-[10px] text-gray-500 font-medium">• {dist}k km</span>
                </div>

                <div className="flex justify-between items-center">
                   <p className={`text-[12px] truncate ${u.unread_count && u.unread_count > 0 ? 'text-white font-medium' : 'text-gray-400 font-medium'}`}>
                     {u.is_blocked ? 'Blocked' : u.status ? (`${u.status}`) : u.last_message_preview || 'Say hi! 👋'}
                   </p>
                   {(!u.is_blocked && u.unread_count && u.unread_count > 0) ? (
                     <div className="ml-2 w-5 h-5 rounded-full bg-[#f27943] text-white flex items-center justify-center text-[10px] font-bold shadow-[0_0_10px_rgba(242,121,67,0.4)] shrink-0">
                       {u.unread_count}
                     </div>
                   ) : null}
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>

      {/* RIGHT PANE: Main Chat Window */}
      <div className="flex-1 flex flex-col relative z-0 bg-[#101217]">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-[#1a1d24] bg-[#1a1d24]/50 backdrop-blur-xl flex items-center justify-between z-20 shrink-0 sticky top-0 shadow-sm">
              <div 
                className="flex items-center gap-4 cursor-pointer hover:bg-white/5 py-1 px-2 -ml-2 rounded-xl transition-colors group"
                onClick={loadUserProfile}
                title="View Full Profile"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-pink-500 to-orange-400 flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-[#242731]">
                    {selectedUser.profile_picture ? <img src={selectedUser.profile_picture} alt="profile" className="w-full h-full object-cover" /> : selectedUser.name.substring(0,2).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h3 className={`text-[16px] font-extrabold tracking-tight group-hover:underline ${selectedUser.is_blocked ? 'text-gray-500 line-through' : 'text-white'}`}>{selectedUser.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold">
                       {/* Explicit Online/Offline Indicator */}
                       {selectedUser.is_blocked ? (
                         <span className="text-gray-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>Blocked</span>
                       ) : selectedUser.is_online ? (
                         <span className="text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]"></span>Online</span>
                       ) : (
                         <span className="text-gray-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>Offline</span>
                       )}
                       
                       <span className="text-gray-600 mx-0.5">•</span>
                       <span className="text-gray-300">
                         {selectedUser.location || 'Unknown'} 
                       </span>
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium flex items-center mt-0.5">
                     <span className="mr-1">✈️</span> {selectedUser.status || "Exploring the world"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-5">
                 <div className="hidden lg:flex flex-col items-end">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-[#242731] rounded-full text-[11px] font-bold text-white">
                        <svg className="w-3 h-3 text-[#f27943]" viewBox="0 0 24 24" fill="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>
                        {mockDistance(selectedUser.email)}k km away
                    </span>
                 </div>
                 
                 <div className="relative">
                   <button onClick={() => setMenuOpen(!menuOpen)} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors hover:bg-[#242731]">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                   </button>
                   {menuOpen && (
                     <div className="absolute right-0 top-12 mt-1 w-44 bg-[#1a1d24] border border-[#333] rounded-xl shadow-2xl py-1 z-50 animate-fade-in-up">
                       <button onClick={toggleBlock} className={`w-full text-left px-4 py-2 text-[14px] font-bold transition-colors ${selectedUser.is_blocked ? 'text-white hover:bg-[#242731]' : 'text-red-500 hover:bg-[#242731]'}`}>
                         {selectedUser.is_blocked ? 'Unblock Contact' : 'Block Contact'}
                       </button>
                     </div>
                   )}
                 </div>
              </div>
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-3 custom-scrollbar z-0 relative scroll-smooth mx-0 min-h-0 bg-[#101217]">
               {/* Messages map... */}
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-[#1a1d24] border border-[#242731] px-5 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                    <div className="w-2 h-2 bg-[#f27943] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#f27943] opacity-70 rounded-full animate-bounce" style={{animationDelay: "0.15s"}}></div>
                    <div className="w-2 h-2 bg-[#f27943] opacity-40 rounded-full animate-bounce" style={{animationDelay: "0.3s"}}></div>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-90 mt-10">
                  <div className="w-20 h-20 rounded-full bg-[#1a1d24] flex items-center justify-center mb-4 border border-[#242731] shadow-lg">
                    <span className="text-3xl">✈️</span>
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Say hello!</h2>
                  <p className="text-gray-500 text-[13px] font-medium max-w-xs text-center mt-1">Send a message or a voice note to {selectedUser.name}.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.sender_email === currentUser?.email;
                  if (!isMine && msg.sender_email !== selectedUser.email) return null;
                  const messageId = msg.id || msg._id;
                  
                  return (
                    <div key={messageId || idx} className={`flex group ${isMine ? "justify-end" : "justify-start"}`}>
                      {isMine && messageId && (
                        <button 
                          onClick={() => handleDeleteMessage(messageId)}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 mr-3 transition-all p-1 self-center"
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                      )}
                      
                      <div className="relative flex flex-col max-w-[70%]">
                         <div
                           className={`px-5 py-3 relative text-[14px] font-semibold leading-relaxed break-words shadow-sm ${
                             isMine
                               ? "bg-gradient-to-br from-[#f27943] to-[#e45a1e] text-white rounded-[20px] rounded-br-[4px]"
                               : "bg-[#1f222a] text-gray-100 rounded-[20px] rounded-bl-[4px] border border-[#2a2e39]"
                           }`}
                         >
                           {msg.message_type === "image" && msg.file_url ? (
                             <div className="mb-2 overflow-hidden rounded-xl bg-black">
                                <img src={msg.file_url} alt="Attachment" className="max-w-full h-auto object-cover max-h-64 rounded-xl" />
                             </div>
                           ) : msg.message_type === "audio" && msg.file_url ? (
                             <div className={`flex items-center gap-3 ${isMine ? 'bg-black/20' : 'bg-[#1a1d24]'} py-2 px-3 rounded-full cursor-pointer hover:opacity-90 transition-opacity w-[220px]`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMine ? 'bg-white text-[#f27943]' : 'bg-[#f27943] text-white'}`}>
                                   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                </div>
                                <div className="flex-1 flex gap-[2px] items-center h-4">
                                  {[...Array(15)].map((_, i) => (
                                     <div key={i} className={`w-1 rounded-full ${isMine ? 'bg-white/80' : 'bg-gray-400'}`} style={{ height: `${Math.max(20, Math.random() * 100)}%`}}></div>
                                  ))}
                                </div>
                                <span className={`text-[10px] font-bold ${isMine ? 'text-white' : 'text-gray-400'}`}>0:08</span>
                                <audio className="hidden" src={msg.file_url} controls />
                             </div>
                           ) : null}
                           
                           {msg.text && <p className={`whitespace-pre-wrap ${msg.message_type !== 'text' ? 'mt-2 text-[13px]' : ''}`}>{msg.text}</p>}
                         </div>
                         
                         {msg.timestamp && (
                           <div className={`mt-1.5 flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                             {isMine && <svg className="w-[14px] h-[14px] text-[#2ebd59]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                             <span className="text-[10px] font-bold text-gray-500 tracking-wider">
                               {new Date(msg.timestamp + "Z").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                           </div>
                         )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Dock Area */}
            <div className="p-4 bg-[#101217] z-20 shrink-0 border-t border-[#1a1d24]">
              <div className="max-w-5xl mx-auto relative px-2">
                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-4 left-2 bg-[#1a1d24] border border-[#2a2e39] p-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-72 z-50">
                    <div className="flex justify-between items-center mb-3 px-1">
                      <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Emojis</span>
                      <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-white transition-colors bg-[#242731] p-1 rounded-full">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {EMOJIS.map(emoji => (
                        <button key={emoji} type="button" onClick={() => setNewMessage(prev => prev + emoji)} className="text-xl hover:bg-[#242731] p-2 rounded-xl transition-transform hover:scale-110">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSendMessage} className="flex bg-[#1b1e25] items-center gap-3 rounded-[24px] pr-2 pl-4 py-2 border border-[#2a2e39] focus-within:border-gray-500 transition-colors shadow-sm">
                  <label className={`cursor-pointer text-gray-400 hover:text-[#f27943] transition-colors p-1 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                     <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                  </label>
                  
                  <button type="button" onClick={() => { setNewMessage(prev => prev + "❤️"); handleSendMessage(); }} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Send Heart">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isUploading ? "Uploading media..." : isRecording ? "Recording voice note..." : "Type a message..."}
                    disabled={isRecording || isUploading || (selectedUser && selectedUser.is_blocked) ? true : false}
                    className="flex-1 bg-transparent text-white px-2 focus:outline-none placeholder-gray-500 font-semibold text-[14px] disabled:opacity-50 h-[38px]"
                  />
                  
                  <div className="flex items-center gap-2">
                     <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-gray-400 hover:text-[#f27943] transition-colors p-1.5 rounded-full hover:bg-white/5">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                     </button>
                     
                     <button type="button" onClick={toggleRecording} className={`text-gray-400 hover:text-[#f27943] transition-colors p-1.5 rounded-full ${isRecording ? 'text-red-500 hover:bg-red-500/10 animate-pulse' : 'hover:bg-white/5'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
                     </button>

                     <button
                       type="submit"
                       disabled={(!newMessage.trim() && !isUploading && !isRecording) || (selectedUser && selectedUser.is_blocked) ? true : false}
                       className="w-10 h-10 rounded-[18px] bg-[#f27943] hover:bg-[#e45a1e] flex items-center justify-center text-white disabled:opacity-50 disabled:bg-gray-700 transition-all shadow-[0_4px_10px_rgba(242,121,67,0.3)] disabled:shadow-none shrink-0"
                     >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="-ml-0.5 mt-0.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                     </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-60 mt-10 p-8 text-center border-l border-[#242731]">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#1a1d24] to-[#242731] flex items-center justify-center text-5xl mb-6 shadow-2xl border border-[#2a2e39] shadow-inner">💬</div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Your Private Space</h2>
            <p className="text-gray-400 max-w-sm font-medium text-[13px] leading-relaxed">Select a conversation from the sidebar or add a new friend via their Unique ID to chat.</p>
          </div>
        )}

        {/* PROFILE SIDE-PANEL OVERLAY */}
         <div 
          className={`absolute top-0 right-0 h-full w-[380px] bg-[#1a1d24] border-l border-[#242731] shadow-[[-20px_0_50px_rgba(0,0,0,0.5)]] z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isProfileOpen ? 'translate-x-0' : 'translate-x-full'}`}
         >
           {isProfileLoading ? (
               <div className="flex-1 flex items-center justify-center">
                   <div className="w-8 h-8 rounded-full border-2 border-[#f27943] border-t-transparent animate-spin"></div>
               </div>
           ) : viewingProfile ? (
             <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
               {/* Banner & Close Button */}
               <div className="relative h-32 bg-gradient-to-tr from-slate-800 to-indigo-900 w-full overflow-hidden shrink-0">
                  {viewingProfile.banner_picture && <img src={viewingProfile.banner_picture} className="w-full h-full object-cover" alt="Banner" />}
                  <button onClick={() => setIsProfileOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
               </div>

               {/* Avatar over banner */}
               <div className="px-6 relative flex justify-between items-end -mt-10 mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-[#101217] p-1 shadow-xl">
                      <div className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-tr from-pink-500 to-orange-400 flex flex-col items-center justify-center text-white font-bold text-3xl">
                           {viewingProfile.profile_picture ? <img src={viewingProfile.profile_picture} alt="Avatar" className="w-full h-full object-cover" /> : viewingProfile.name?.substring(0,2).toUpperCase()}
                      </div>
                  </div>
                  <div className="mb-2">
                     <span className="px-3 py-1 bg-[#101217] border border-[#242731] rounded-full text-xs font-bold text-[#f27943] shadow-lg flex items-center gap-1.5">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3" stroke="black" strokeWidth="2"></path></svg>
                       {viewingProfile.points} Points
                     </span>
                  </div>
               </div>

               {/* Profile Info */}
               <div className="px-6 space-y-6">
                 <div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">{viewingProfile.name}</h2>
                    <p className="text-[#f27943] font-semibold text-[13px] mt-0.5 flex items-center gap-1.5">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="10" r="3"></circle><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path></svg>
                       {viewingProfile.location || "Location Private"}
                    </p>
                 </div>

                 <div className="bg-[#101217] rounded-2xl p-4 border border-[#242731] shadow-inner">
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">About</p>
                   <p className="text-gray-300 text-[13px] leading-relaxed font-medium">
                     {viewingProfile.bio || `No bio set. ${viewingProfile.name} is mysterious.`}
                   </p>
                 </div>

                 {viewingProfile.travel_preferences && viewingProfile.travel_preferences.length > 0 && (
                   <div>
                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Travel Preferences</p>
                     <div className="flex flex-wrap gap-2">
                        {viewingProfile.travel_preferences.map((pref, i) => (
                          <span key={i} className="px-3 py-1.5 bg-[#242731] border border-[#2a2e39] text-gray-200 text-xs font-semibold rounded-full">
                            {pref}
                          </span>
                        ))}
                     </div>
                   </div>
                 )}

                 {viewingProfile.visited_locations && viewingProfile.visited_locations.length > 0 && (
                   <div>
                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Passport Stamps</p>
                     <div className="flex flex-wrap gap-3">
                        {viewingProfile.visited_locations.map((loc, i) => (
                           <div key={i} className="relative group" title={loc}>
                             <div className="w-16 h-16 rounded-full border-[2px] border-dashed border-[#f27943]/40 bg-[#f27943]/10 flex flex-col items-center justify-center p-1 text-center transform -rotate-12 group-hover:rotate-0 transition-transform duration-300 shadow-[0_0_10px_rgba(242,121,67,0.15)]">
                               <span className="text-lg opacity-80 leading-none mb-0.5">🌍</span>
                               <span className="text-[7px] font-bold text-[#f27943] uppercase leading-tight tracking-wider line-clamp-1 truncate w-full px-1">{loc}</span>
                             </div>
                           </div>
                        ))}
                     </div>
                   </div>
                 )}

                 {/* Stats / Extras */}
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-tr from-[#12151c] to-[#1a1d24] border border-[#242731] rounded-2xl p-3 flex flex-col">
                       <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Age</span>
                       <span className="text-white font-bold text-lg">{viewingProfile.age || '—'}</span>
                    </div>
                    <div className="bg-gradient-to-tr from-[#12151c] to-[#1a1d24] border border-[#242731] rounded-2xl p-3 flex flex-col">
                       <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Unique ID</span>
                       <span className="text-white font-bold text-[14px] truncate">@{viewingProfile.user_id || 'private'}</span>
                    </div>
                 </div>

                 {viewingProfile.badges && viewingProfile.badges.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Badges</p>
                      <div className="flex flex-wrap gap-2">
                        {viewingProfile.badges.map((badge, i) => (
                          <div key={i} className="w-10 h-10 rounded-xl bg-[#242731] flex items-center justify-center shadow-inner" title={badge}>
                            🏆
                          </div>
                        ))}
                      </div>
                    </div>
                 )}

                 {/* Socials */}
                 {(viewingProfile.instagram_url || viewingProfile.twitter_url) && (
                   <div className="pt-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Socials</p>
                      <div className="flex gap-3">
                         {viewingProfile.instagram_url && (
                           <a href={viewingProfile.instagram_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg">
                             Ig
                           </a>
                         )}
                         {viewingProfile.twitter_url && (
                           <a href={viewingProfile.twitter_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-black border border-gray-700 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg">
                             𝕏
                           </a>
                         )}
                      </div>
                   </div>
                 )}

               </div>
               <div className="h-10"></div>
             </div>
           ) : null}
         </div>

      </div>
      
      <style>{`
        @keyframes fadeInUp {
           0% { opacity: 0; transform: translateY(10px); }
           100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
           animation: fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #242731;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #3f4455;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
