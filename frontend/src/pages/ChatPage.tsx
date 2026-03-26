import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { getChatUsers, getChatHistory, sendChatMessage, getProfile, addChatContact, deleteChatMessage, getUploadSignature } from "../services/apiService";
import type { ChatUser, ChatMessage, UserProfile } from "../services/apiService";
import { Link } from "react-router-dom";
import axios from "axios";

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

  // Initialize WebSocket with auto-reconnect
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
          } else if (data.type === "delete_message") {
            setMessages((prev) => prev.filter((m) => (m.id || m._id) !== data.message_id));
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

  // Load chat history when selected user changes
  useEffect(() => {
    if (!selectedUser) return;
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const history = await getChatHistory(selectedUser.email);
        setMessages(history);
      } catch (err) {
        console.error("Failed to fetch chat history");
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, [selectedUser]);

  // Auto-scroll to latest message using container scrolling (prevents entire window from scrolling)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Avoid duplicates
      setUsers(prev => prev.find(u => u.email === newContact.email) ? prev : [...prev, newContact]);
      setAddContactId("");
      alert("Contact added successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to add contact.");
    } finally {
      setIsAddingContact(false);
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
      // Ensure audio goes through properly by passing resource_type as video. Cloudinary handles audio as video.

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
          
          // Stop all streams to turn off recording indicator
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

  if (currentUser && !currentUser.user_id) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] bg-gray-900 border-t border-gray-800 mt-20 px-4 text-center">
        <div className="w-24 h-24 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-5xl mb-6 shadow-xl border border-indigo-500/30 backdrop-blur-md">
          🔒
        </div>
        <h2 className="text-3xl font-bold text-gray-100 mb-3">Chat is Locked</h2>
        <p className="text-gray-400 max-w-md mb-8">
          To maintain absolute privacy, you need to claim a unique User ID before you can send or receive messages. This acts as your Friend Code.
        </p>
        <Link 
          to="/profile" 
          className="px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all"
        >
          Claim Your ID in Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-slate-950 font-sans mt-20 relative overflow-hidden">
      
      {/* Decorative ambient background glowing orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/30 rounded-full blur-[140px] pointer-events-none mix-blend-screen opacity-70 animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen opacity-60"></div>
      <div className="absolute top-[30%] left-[40%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen opacity-50"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>

      {/* LEFT SIDEBAR: Contacts */}
      <div className="w-1/3 max-w-md bg-white/[0.02] backdrop-blur-3xl border-r border-white/10 flex flex-col z-10 shadow-2xl">
        <div className="p-6 border-b border-white/10 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-sm tracking-tight">Messages</h2>
          </div>
          <p className="text-sm text-gray-400 font-medium mb-5 flex items-center gap-2">
            Share this ID to connect: <span className="font-mono text-indigo-300 font-bold bg-indigo-500/20 px-2 py-1 rounded-md border border-indigo-500/30 tracking-wider shadow-inner">@{currentUser?.user_id}</span>
          </p>
          
          <form onSubmit={handleAddContact} className="flex gap-2 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <input 
              type="text" 
              value={addContactId}
              onChange={(e) => setAddContactId(e.target.value.replace(/[^A-Za-z0-9_]/g, ''))}
              placeholder="Add friend by ID..." 
              className="flex-1 bg-black/40 border border-white/10 text-white text-sm rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner placeholder-gray-600"
            />
            <button 
              type="submit"
              disabled={isAddingContact || !addContactId.trim()}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95 flex items-center justify-center min-w-[70px]"
            >
              {isAddingContact ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span> : "Add"}
            </button>
          </form>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 custom-scrollbar min-h-0">
          {users.map((u) => (
            <div
              key={u.email}
              onClick={() => setSelectedUser(u)}
              className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 border flex items-center gap-4 group ${
                selectedUser?.email === u.email
                  ? "bg-white/10 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md translate-x-2"
                  : "bg-transparent border-transparent hover:bg-white/[0.05] hover:border-white/10"
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ring-2 ring-offset-2 ring-offset-slate-950 transition-all ${selectedUser?.email === u.email ? 'bg-gradient-to-tr from-indigo-500 to-pink-500 ring-indigo-500/50 scale-105' : 'bg-gradient-to-tr from-slate-700 to-slate-600 ring-transparent group-hover:ring-white/20'}`}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className={`font-bold truncate transition-colors ${selectedUser?.email === u.email ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{u.name}</h3>
                <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1.5 font-medium">
                  <span className={`w-2 h-2 rounded-full inline-block ${selectedUser?.email === u.email ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]' : 'bg-gray-600'}`}></span>
                  {selectedUser?.email === u.email ? 'Active Now' : 'Tap to chat'}
                </p>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4 opacity-60">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-2xl mb-3 border border-white/10">👥</div>
              <p className="text-gray-400 text-sm">No contacts yet. Share your ID or add a friend to start chatting!</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Chat Window */}
      <div className="flex-1 flex flex-col relative z-10 bg-black/20 backdrop-blur-sm border-l border-white/5">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="px-8 py-5 border-b border-white/10 bg-white/[0.03] backdrop-blur-2xl flex items-center justify-between shadow-sm z-20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-teal-400 border-2 border-slate-900 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.8)]"></span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{selectedUser.name}</h3>
                  <p className="text-xs text-teal-400 font-medium">Online</p>
                </div>
              </div>
              <div className="flex gap-3">
                 <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-white/5">
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                 </button>
              </div>
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6 custom-scrollbar z-0 relative scroll-smooth mx-2 min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl">
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: "0.15s"}}></div>
                    <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: "0.3s"}}></div>
                    <span className="text-gray-300 font-medium ml-2 text-sm tracking-wide">Decrypting messages...</span>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-80 mt-10">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 flex flex-col items-center justify-center mb-6 shadow-2xl border border-indigo-500/20 backdrop-blur-xl relative group cursor-default hover:scale-105 transition-transform duration-500">
                    <span className="text-6xl group-hover:animate-wiggle">👋</span>
                    <div className="absolute inset-0 rounded-full bg-white/5 mix-blend-overlay"></div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Say hello to {selectedUser.name}!</h2>
                  <p className="text-gray-400 text-sm max-w-xs text-center leading-relaxed">Send a voice note, share a picture, or just drop a friendly text.</p>
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
                          className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 mr-2 transition-all p-2 rounded-full hover:bg-red-500/10 self-center scale-90 hover:scale-100"
                          title="Delete message"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                      )}
                      <div
                        className={`max-w-[80%] lg:max-w-[65%] rounded-3xl px-5 py-3 shadow-xl backdrop-blur-md relative font-medium leading-relaxed ${
                          isMine
                            ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-br-[4px] border border-indigo-400/20 shadow-indigo-900/40"
                            : "bg-white/[0.07] text-gray-100 border border-white/10 rounded-bl-[4px] shadow-black/40"
                        }`}
                      >
                        {msg.message_type === "image" && msg.file_url ? (
                          <div className="mb-3 overflow-hidden rounded-xl border border-white/10 shadow-inner bg-black/20">
                             <img src={msg.file_url} alt="Attachment" className="max-w-full max-h-72 object-contain w-full hover:scale-105 transition-transform duration-700" />
                          </div>
                        ) : msg.message_type === "audio" && msg.file_url ? (
                          <div className="mb-2 w-full min-w-[200px] flex items-center bg-black/20 rounded-xl p-1 border border-white/5">
                             <audio controls src={msg.file_url} className="h-10 w-full custom-audio-player opacity-90 sepia-[.2] hue-rotate-180" />
                          </div>
                        ) : null}
                        
                        {msg.text && <p className={`whitespace-pre-wrap ${msg.message_type !== 'text' ? 'text-sm mt-2 opacity-90' : 'text-[15px]'}`}>{msg.text}</p>}

                        {msg.timestamp && (
                          <div className={`mt-2 flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
                            <span className={`text-[10px] font-bold tracking-widest uppercase opacity-60 ${isMine ? "text-indigo-100" : "text-gray-400"}`}>
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

            {/* Floating Input Dock Area */}
            <div className="p-4 lg:p-6 pb-6 lg:pb-8 bg-transparent z-20 relative shrink-0">
              <div className="max-w-4xl mx-auto">
                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-4 left-6 bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-4 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] w-72 z-50 transform transition-all animate-fade-in-up">
                    <div className="flex justify-between items-center mb-3 px-1 border-b border-white/10 pb-2">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Emojis</span>
                      <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-start">
                      {EMOJIS.map(emoji => (
                        <button key={emoji} type="button" onClick={() => setNewMessage(prev => prev + emoji)} className="text-2xl hover:bg-white/10 hover:scale-110 p-2 rounded-xl transition-all">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSendMessage} className="flex relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 shadow-2xl items-center ring-1 ring-white/5 focus-within:ring-white/20 focus-within:bg-white/[0.05] transition-all duration-300">
                  
                  {/* Left Attachment Actions */}
                  <div className="flex items-center gap-1 px-2 text-gray-400">
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2.5 rounded-full hover:text-yellow-400 hover:bg-white/10 transition-colors ${showEmojiPicker ? 'text-yellow-400 bg-white/10' : ''}`} title="Emojis">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                    <label className={`p-2.5 rounded-full hover:bg-white/10 hover:text-indigo-400 transition-colors cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`} title="Upload Image">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                    </label>

                    <button 
                      type="button" 
                      onClick={toggleRecording} 
                      className={`p-2.5 rounded-full transition-all flex items-center gap-2 ${isRecording ? 'bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' : 'hover:bg-white/10 hover:text-red-400'} ${isUploading ? 'opacity-50 pointer-events-none' : ''}`} 
                      title="Voice Note"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
                    </button>
                  </div>
                  
                  {/* Text Input */}
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isUploading ? "Uploading media..." : isRecording ? "Recording voice note... (Click mic to stop)" : "Type a message..."}
                    disabled={isRecording || isUploading}
                    className="flex-1 bg-transparent text-white px-2 py-3 focus:outline-none placeholder-gray-500 font-medium text-[15px]"
                  />
                  
                  {/* Send Button */}
                  <div className="pr-1 pl-2">
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || isUploading || isRecording}
                      className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white disabled:opacity-40 disabled:scale-100 hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-indigo-500/50 shrink-0 border border-indigo-400/30 group"
                    >
                      <svg className="w-5 h-5 ml-1 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-80 mt-10 p-8 text-center bg-black/10">
            <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-tr from-indigo-900/40 to-purple-900/40 flex items-center justify-center text-6xl mb-8 shadow-[0_0_50px_rgba(99,102,241,0.15)] border border-white/10 backdrop-blur-xl rotate-12 hover:rotate-0 transition-transform duration-500">
              💬
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Your Private Space</h2>
            <p className="text-gray-400 max-w-sm leading-relaxed">Select a conversation from the sidebar or add a new friend via their Unique ID to launch the encrypting bridge.</p>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
           0% { opacity: 0; transform: translateY(10px); }
           100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
           animation: fadeIn 0.2s ease-out forwards;
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        .animate-wiggle {
          animation: wiggle 1s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255,255,255,0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255,255,255,0.3);
        }
        /* Style standard audio players specifically if needed */
        audio::-webkit-media-controls-panel {
          background-color: rgba(255, 255, 255, 0.9);
        }
      `}</style>
    </div>
  );
};
