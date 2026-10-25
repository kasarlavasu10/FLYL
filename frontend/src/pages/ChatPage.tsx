import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCall } from '../context/CallContext';
import { api } from '../services/api';
import { Conversation, Message, User } from '../types';
import { soundEffects } from '../utils/audio';
import { 
  Send, Image, Paperclip, Phone, Video, Smile, 
  Search, Check, CheckCheck, MoreVertical, X, FileText, ArrowLeft 
} from 'lucide-react';

const COMMON_EMOJIS = ['😊', '😂', '🔥', '👍', '❤️', '🎉', '👋', '✨', '🚀', '🙌'];

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { startCall } = useCall();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(
    searchParams.get('c') ? parseInt(searchParams.get('c')!, 10) : null
  );

  const [activePartner, setActivePartner] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Load conversations list
  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations || []);

      // If activeConvId is not set and there are conversations, default to first on desktop
      if (!activeConvId && res.conversations && res.conversations.length > 0 && window.innerWidth >= 768) {
        setActiveConvId(res.conversations[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Sync activeConvId with search query param
  useEffect(() => {
    const cid = searchParams.get('c');
    if (cid) {
      setActiveConvId(parseInt(cid, 10));
    }
  }, [searchParams]);

  // Load active conversation messages
  useEffect(() => {
    if (!activeConvId) return;

    let isSubscribed = true;

    async function loadMessages() {
      try {
        const res = await api.getMessages(activeConvId!);
        if (isSubscribed) {
          setActivePartner(res.partner);
          setMessages(res.messages || []);
          api.markConversationRead(activeConvId!);

          // Join Socket room
          if (socket) {
            socket.emit('conversation:join', activeConvId);
            socket.emit('chat:mark_read', { conversationId: activeConvId });
          }
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }

    loadMessages();

    return () => {
      isSubscribed = false;
      if (socket && activeConvId) {
        socket.emit('conversation:leave', activeConvId);
      }
    };
  }, [activeConvId]);

  // Ensure socket joins conversation room whenever socket is ready
  useEffect(() => {
    if (socket && activeConvId) {
      socket.emit('conversation:join', activeConvId);
      socket.emit('chat:mark_read', { conversationId: activeConvId });
    }
  }, [socket, activeConvId]);

  // Socket event listeners for incoming messages & typing
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      if (Number(msg.conversation_id) === Number(activeConvId)) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        if (Number(msg.sender_id) !== Number(user?.id)) {
          soundEffects.playMessageSound();
        }
        api.markConversationRead(activeConvId);
      }
      // Update preview in conversations list
      setConversations((prev) =>
        prev.map((c) =>
          Number(c.id) === Number(msg.conversation_id)
            ? {
                ...c,
                last_message: msg.content,
                last_attachment_type: msg.attachment_type,
                last_message_time: msg.created_at,
                last_message_sender_id: msg.sender_id,
                unread_count: Number(msg.conversation_id) === Number(activeConvId) ? 0 : c.unread_count + 1,
              }
            : c
        )
      );
    };

    const handleUserTyping = (data: { conversationId: number; isTyping: boolean }) => {
      if (Number(data.conversationId) === Number(activeConvId)) {
        setPartnerTyping(data.isTyping);
      }
    };

    const handleMessagesRead = (data: { conversationId: number; readBy: number }) => {
      if (Number(data.conversationId) === Number(activeConvId)) {
        setMessages((prev) => prev.map((m) => (Number(m.sender_id) === Number(user?.id) ? { ...m, status: 'read' } : m)));
      }
    };

    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:user_typing', handleUserTyping);
    socket.on('chat:messages_read', handleMessagesRead);

    return () => {
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:user_typing', handleUserTyping);
      socket.off('chat:messages_read', handleMessagesRead);
    };
  }, [socket, activeConvId, user?.id]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  // Handle typing indicator emission
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    if (socket && activeConvId) {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit('chat:typing', { conversationId: activeConvId, isTyping: true });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('chat:typing', { conversationId: activeConvId, isTyping: false });
      }, 1500);
    }
  };

  // Attachment upload handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachment(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (re) => setAttachmentPreview(re.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreview(null);
      }
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || (!messageText.trim() && !attachment)) return;

    const formData = new FormData();
    formData.append('conversation_id', activeConvId.toString());
    if (messageText.trim()) formData.append('content', messageText.trim());
    if (attachment) formData.append('attachment', attachment);

    const sendingText = messageText.trim();
    setMessageText('');
    removeAttachment();
    setShowEmojiPicker(false);

    try {
      const res = await api.sendMessage(formData);
      if (res.message) {
        setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
        if (socket) {
          socket.emit('chat:send_message', res.message);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
      setMessageText(sendingText);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.partner_name?.toLowerCase().includes(convSearch.toLowerCase()) ||
      c.partner_username?.toLowerCase().includes(convSearch.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm flex overflow-hidden">
      {/* 1. Left Conversation List Sidebar */}
      <div
        className={`${
          activeConvId ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0`}
      >
        {/* Sidebar Header & Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Chats</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No conversations found. Explore people to start chatting!
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setSearchParams({ c: conv.id.toString() });
                  }}
                  className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.partner_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                      alt={conv.partner_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {conv.partner_is_online ? (
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${
                          isSelected ? 'border-indigo-600 bg-emerald-400' : 'border-white dark:border-slate-900 bg-emerald-500'
                        }`}
                      ></span>
                    ) : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {conv.partner_name}
                      </p>
                      {conv.last_message_time && (
                        <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-xs truncate max-w-[170px] ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {conv.last_message || (conv.last_attachment_type ? 'Sent an attachment' : 'Say hello!')}
                      </p>
                      {conv.unread_count > 0 && !isSelected && (
                        <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right Chat Conversation Area */}
      <div className={`${activeConvId ? 'flex' : 'hidden md:flex'} flex-col flex-1 h-full bg-white dark:bg-slate-900`}>
        {activeConvId && activePartner ? (
          <>
            {/* Active Chat Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveConvId(null);
                    setSearchParams({});
                  }}
                  className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg"
                >
                  <ArrowLeft size={20} />
                </button>

                <Link to={`/profile/${activePartner.username}`} className="relative shrink-0 group">
                  <img
                    src={activePartner.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                    alt={activePartner.full_name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/50 group-hover:scale-105 transition-transform"
                  />
                  {activePartner.is_online ? (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                  ) : null}
                </Link>

                <div>
                  <Link
                    to={`/profile/${activePartner.username}`}
                    className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    {activePartner.full_name}
                  </Link>
                  <p className="text-[11px] text-slate-400">
                    {partnerTyping ? (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">Typing...</span>
                    ) : activePartner.is_online ? (
                      <span className="text-emerald-500 font-medium">Active now</span>
                    ) : (
                      `Offline`
                    )}
                  </p>
                </div>
              </div>

              {/* Call Triggers in Chat Header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startCall(activePartner, 'audio')}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition"
                  title="Start Audio Call"
                >
                  <Phone size={18} />
                </button>

                <button
                  onClick={() => startCall(activePartner, 'video')}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/30 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition"
                  title="Start Video Call"
                >
                  <Video size={18} />
                </button>

                <Link
                  to={`/profile/${activePartner.username}`}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                  title="View Profile"
                >
                  <MoreVertical size={18} />
                </Link>
              </div>
            </div>

            {/* Chat Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 dark:bg-slate-950/30">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-3">
                    <Send size={24} />
                  </div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-200">Start the conversation</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Send a message or make a call to connect with {activePartner.full_name}!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = Number(msg.sender_id) === Number(user?.id);
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <img
                          src={msg.sender_avatar || activePartner.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                          alt={msg.sender_name || activePartner.full_name}
                          className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                        />
                      )}

                      <div className={`max-w-[75%] sm:max-w-md flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && (
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5 ml-1">
                            {msg.sender_name || activePartner.full_name}
                          </span>
                        )}
                        <div
                          className={`rounded-2xl p-3.5 shadow-sm text-sm ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 rounded-bl-none'
                          }`}
                        >
                          {/* Attachment Display */}
                          {msg.attachment_url && (
                            <div className="mb-2 rounded-xl overflow-hidden">
                              {msg.attachment_type === 'image' ? (
                                <img
                                  src={msg.attachment_url}
                                  alt="Attachment"
                                  className="max-h-60 rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                                  onClick={() => window.open(msg.attachment_url, '_blank')}
                                />
                              ) : (
                                <a
                                  href={msg.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 rounded-lg bg-black/10 dark:bg-white/10 hover:underline text-xs"
                                >
                                  <FileText size={18} />
                                  <span className="truncate">{msg.attachment_name || 'Download Attachment'}</span>
                                </a>
                              )}
                            </div>
                          )}

                          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                        </div>

                        {/* Timestamp & Read Receipt Checkmarks */}
                        <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && (
                            <span>
                              {msg.status === 'read' ? (
                                <CheckCheck size={13} className="text-indigo-500 inline" />
                              ) : (
                                <Check size={13} className="inline" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Partner Typing Bubble */}
              {partnerTyping && (
                <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                  <div className="bg-slate-200 dark:bg-slate-800 px-3 py-2 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span>{activePartner.full_name} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Attachment Preview Box */}
            {attachment && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {attachmentPreview ? (
                    <img src={attachmentPreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                  )}
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">{attachment.name}</p>
                    <p className="text-[10px] text-slate-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={removeAttachment} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Quick Emoji Bar Popup */}
            {showEmojiPicker && (
              <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center gap-2 overflow-x-auto">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setMessageText((prev) => prev + emoji)}
                    className="text-xl p-1 hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Message Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,audio/*,.pdf,.zip,.txt"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                title="Attach image or file"
              >
                <Paperclip size={19} />
              </button>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                title="Emojis"
              >
                <Smile size={19} />
              </button>

              <input
                type="text"
                placeholder={`Message ${activePartner.full_name}...`}
                value={messageText}
                onChange={handleInputChange}
                className="flex-1 bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-sm focus:outline-none transition"
              />

              <button
                type="submit"
                disabled={!messageText.trim() && !attachment}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl shadow-md transition hover:scale-105 active:scale-95"
                title="Send"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-4">
              <Send size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Select a Conversation</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-sm">
              Choose an existing chat from the left or search for people in the Explore tab to start talking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
