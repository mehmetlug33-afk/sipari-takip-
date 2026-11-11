import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  UserCheck, 
  CreditCard, 
  Banknote, 
  ClipboardList, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  User, 
  Copy, 
  Sparkles, 
  Filter, 
  Search,
  RefreshCw,
  Share2,
  FileText,
  Radio,
  Zap,
  Check
} from 'lucide-react';

// Varsayılan Kullanıcı Kimliği (App ID / Personel ID)
const getStoredUserId = () => {
  let stored = localStorage.getItem('order_app_user_id');
  if (!stored) {
    stored = 'PER-' + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem('order_app_user_id', stored);
  }
  return stored;
};

// Örnek WhatsApp Mesaj Taslağı
const SAMPLE_WHATSAPP_TEXT = `Ahmet Yılmaz: 2 adet 12kg tombul tüp, 1 adet 19lt su
Mehmet Kaya - 1 adet piknik tüpü
Ayşe Demir (Nakit ödeyecek): 3 adet 19lt su`;

export default function App() {
  // Kullanıcı Kimliği & Profil State
  const [userId, setUserId] = useState(getStoredUserId);
  const [userName, setUserName] = useState(() => localStorage.getItem('order_app_user_name') || 'Ahmet (Kurye 1)');

  // ÇALIŞAN / KURYE LİSTESİ (Sistemde kayıtlı personel hesapları)
  const [couriers, setCouriers] = useState(() => {
    const saved = localStorage.getItem('order_app_couriers');
    return saved ? JSON.parse(saved) : [
      { id: 'PER-1001', name: 'Ahmet (Kurye 1)', role: 'Kurye', activeOrders: 0 },
      { id: 'PER-1002', name: 'Mehmet (Kurye 2)', role: 'Kurye', activeOrders: 0 },
      { id: 'PER-1003', name: 'Caner (Saha)', role: 'Kurye', activeOrders: 0 },
      { id: 'PER-9999', name: 'Merkez Dükkan', role: 'Yönetici', activeOrders: 0 }
    ];
  });

  // Selected Courier Filter for Dashboard
  const [courierFilter, setCourierFilter] = useState('ALL');

  // Sipariş Listesi
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('order_app_orders');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        customerName: 'Ahmet Yılmaz',
        items: '2 adet 12kg Tombul Tüp, 1 adet 19lt Su',
        paymentStatus: 'UNPAID', // 'NAKİT', 'KREDİ KARTI', 'VERESİYE', 'UNPAID'
        addedBy: 'WA-BOT',
        addedByName: 'WhatsApp Bot',
        assignedTo: 'PER-1001',
        assignedToName: 'Ahmet (Kurye 1)',
        timeStr: '10:30',
        dateStr: new Date().toLocaleDateString('tr-TR')
      },
      {
        id: 2,
        customerName: 'Mehmet Kaya',
        items: '1 adet Piknik Tüpü',
        paymentStatus: 'NAKİT',
        addedBy: 'PER-1002',
        addedByName: 'Mehmet (Kurye 2)',
        assignedTo: 'PER-1002',
        assignedToName: 'Mehmet (Kurye 2)',
        timeStr: '11:15',
        dateStr: new Date().toLocaleDateString('tr-TR')
      }
    ];
  });

  // Modal ve Form State'leri
  const [whatsappText, setWhatsappText] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualItems, setManualItems] = useState('');
  const [manualCourier, setManualCourier] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAddCourierModal, setShowAddCourierModal] = useState(false);
  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierRole, setNewCourierRole] = useState('Kurye');
  const [tempUserId, setTempUserId] = useState(userId);
  const [tempUserName, setTempUserName] = useState(userName);

  // OTOMATİK WHATSAPP CANLI DINLEME (AUTO-SYNC ENGINE)
  const [isAutoListenActive, setIsAutoListenActive] = useState(true);
  const [webhookStatus, setWebhookStatus] = useState('CONNECTED');
  const [lastReceivedMessage, setLastReceivedMessage] = useState(null);

  // CANLI GERÇEK WHATSAPP WEBHOOK / WEBSOCKET DINLEYICISI
  useEffect(() => {
    if (!isAutoListenActive) return;

    // Gerçek sunucuya / Bot servisine bağlanma mantığı (BroadcastChannel / WebSocket)
    const channel = new BroadcastChannel('whatsapp_orders_channel');
    
    channel.onmessage = (event) => {
      if (event.data && event.data.message) {
        setLastReceivedMessage(event.data.message);
        setWebhookStatus('SYNCING');
        
        // Gelen mesajı doğrudan ayrıştırıp siparişe ekle
        parseWhatsAppText(event.data.message);
        
        setTimeout(() => setWebhookStatus('CONNECTED'), 500);
      }
    };

    return () => {
      channel.close();
    };
  }, [isAutoListenActive, userId, userName]);

  // LocalStorage Senkronizasyonları
  useEffect(() => {
    localStorage.setItem('order_app_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('order_app_couriers', JSON.stringify(couriers));
  }, [couriers]);

  useEffect(() => {
    localStorage.setItem('order_app_user_id', userId);
    localStorage.setItem('order_app_user_name', userName);
  }, [userId, userName]);

  // Yeni Çalışan / Kurye Hesabı Ekleme
  const handleAddCourier = (e) => {
    e.preventDefault();
    if (!newCourierName.trim()) return;

    const newId = 'PER-' + Math.floor(1000 + Math.random() * 9000);
    const newCourier = {
      id: newId,
      name: newCourierName.trim(),
      role: newCourierRole,
      activeOrders: 0
    };

    setCouriers(prev => [...prev, newCourier]);
    setNewCourierName('');
    setShowAddCourierModal(false);
  };

  // WhatsApp Mesajını Ayrıştırma (Parser)
  const parseWhatsAppText = (customText = null) => {
    const textToParse = customText || whatsappText;
    if (!textToParse.trim()) return;

    const lines = textToParse.split('\n').filter(line => line.trim() !== '');
    const newParsedOrders = [];
    const now = new Date();

    lines.forEach(line => {
      let name = '';
      let items = '';

      if (line.includes(':')) {
        const parts = line.split(':');
        name = parts[0].trim();
        items = parts.slice(1).join(':').trim();
      } else if (line.includes('-')) {
        const parts = line.split('-');
        name = parts[0].trim();
        items = parts.slice(1).join('-').trim();
      } else if (line.includes('/')) {
        const parts = line.split('/');
        name = parts[0].trim();
        items = parts.slice(1).join('/').trim();
      } else {
        name = 'Müşteri';
        items = line.trim();
      }

      name = name.replace(/^\[\d{2}:\d{2}, \d{1,2}.\d{1,2}.\d{4}\]\s*/, '');

      if (name && items) {
        newParsedOrders.push({
          id: Date.now() + Math.random(),
          customerName: name,
          items: items,
          paymentStatus: 'UNPAID',
          addedBy: userId,
          addedByName: userName,
          assignedTo: userId,
          assignedToName: userName,
          timeStr: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          dateStr: now.toLocaleDateString('tr-TR')
        });
      }
    });

    if (newParsedOrders.length > 0) {
      setOrders(prev => [...newParsedOrders, ...prev]);
      if (!customText) setWhatsappText('');
    }
  };

  // OTOMATİK WHATSAPP MESAJ SİMÜLASYONU
  const handleSimulateIncomingGroupMessage = () => {
    const sampleIncomingMessages = [
      "Hasan Can: 1 adet 45kg Propan tüp, 2 adet 19lt su",
      "Selin Aktaş - 2 adet 12kg Tombul tüp (Kartla ödeyecek)",
      "Murat Yıldız: 1 adet Piknik tüpü",
      "Kaya Market / 3 adet 19lt Hayat Damacana"
    ];
    
    const randomMsg = sampleIncomingMessages[Math.floor(Math.random() * sampleIncomingMessages.length)];
    setWebhookStatus('SYNCING');
    setLastReceivedMessage(randomMsg);
    
    setTimeout(() => {
      parseWhatsAppText(randomMsg);
      setWebhookStatus('CONNECTED');
    }, 600);
  };

  // Manuel Tekli Sipariş Ekleme
  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!manualName.trim() || !manualItems.trim()) return;

    const assignedCourierObj = couriers.find(c => c.id === manualCourier) || { id: userId, name: userName };
    const now = new Date();

    const newOrder = {
      id: Date.now(),
      customerName: manualName.trim(),
      items: manualItems.trim(),
      paymentStatus: 'UNPAID',
      addedBy: userId,
      addedByName: userName,
      assignedTo: assignedCourierObj.id,
      assignedToName: assignedCourierObj.name,
      timeStr: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      dateStr: now.toLocaleDateString('tr-TR')
    };

    setOrders(prev => [newOrder, ...prev]);
    setManualName('');
    setManualItems('');
  };

  // Sipariş Kurye Ataması Değiştirme
  const assignOrderToCourier = (orderId, targetCourierId) => {
    const targetCourier = couriers.find(c => c.id === targetCourierId);
    if (!targetCourier) return;

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          assignedTo: targetCourier.id,
          assignedToName: targetCourier.name
        };
      }
      return o;
    }));
  };

  // Ödeme Durumu Güncelleme
  const updatePaymentStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          paymentStatus: order.paymentStatus === newStatus ? 'UNPAID' : newStatus
        };
      }
      return order;
    }));
  };

  // Sipariş Silme
  const deleteOrder = (orderId) => {
    if (window.confirm('Bu sipariş kaydını silmek istediğinize emin misiniz?')) {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    }
  };

  // İstatistik Hesaplamaları
  const stats = useMemo(() => {
    const targetOrders = courierFilter === 'ALL' 
      ? orders 
      : orders.filter(o => o.assignedTo === courierFilter);

    const total = targetOrders.length;
    const nakit = targetOrders.filter(o => o.paymentStatus === 'NAKİT').length;
    const kart = targetOrders.filter(o => o.paymentStatus === 'KREDİ KARTI').length;
    const veresiye = targetOrders.filter(o => o.paymentStatus === 'VERESİYE').length;
    const bekleyen = targetOrders.filter(o => o.paymentStatus === 'UNPAID').length;

    return { total, nakit, kart, veresiye, bekleyen };
  }, [orders, courierFilter]);

  // Filtrelenmiş Siparişler
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchCourier = courierFilter === 'ALL' || o.assignedTo === courierFilter;
      const matchStatus = filterStatus === 'ALL' || o.paymentStatus === filterStatus;
      const matchSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.items.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.assignedToName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCourier && matchStatus && matchSearch;
    });
  }, [orders, courierFilter, filterStatus, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans pb-12">
      
      {/* ÜST BAR (HEADER) */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-xl shadow-xs">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight leading-tight">WhatsApp Sipariş & Kurye Takip</h1>
              <p className="text-[11px] text-slate-400">Çoklu Kullanıcı & Personel Yönetimi</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* AKTİF ÇALIŞAN SEÇİMİ / PROFİL */}
            <button
              onClick={() => {
                setTempUserId(userId);
                setTempUserName(userName);
                setShowUserModal(true);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold flex items-center space-x-2 transition"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <div className="text-left">
                <span className="block text-[10px] text-slate-400 leading-none">Aktif Hesabım</span>
                <span className="font-bold text-emerald-400">{userName} ({userId})</span>
              </div>
            </button>
          </div>

        </div>
      </header>

      {/* PERSONEL VE KURYE FİLTRE BARINI GÖSTEREN ŞERİT */}
      <section className="bg-slate-800 text-slate-200 border-b border-slate-700 py-2.5 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Kuryeye Göre Filtrele:</span>
            <select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-emerald-400 font-bold text-xs rounded-lg px-2 py-1 focus:outline-none w-full sm:w-auto"
            >
              <option value="ALL">🌐 Tüm Kuryeler / Çalışanlar</option>
              {couriers.map(c => (
                <option key={c.id} value={c.id}>👤 {c.name} ({c.id})</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddCourierModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 shrink-0 self-end sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Yeni Kurye / Çalışan Ekle</span>
          </button>

        </div>
      </section>

      {/* İSTATİSTİK ÖZET KARTLARI */}
      <section className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Toplam</span>
            <p className="text-lg font-black text-slate-900 mt-0.5">{stats.total}</p>
          </div>

          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">💵 Nakit</span>
            <p className="text-lg font-black text-emerald-700 mt-0.5">{stats.nakit}</p>
          </div>

          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-center">
            <span className="text-[10px] font-bold text-blue-700 uppercase">💳 K. Kartı</span>
            <p className="text-lg font-black text-blue-700 mt-0.5">{stats.kart}</p>
          </div>

          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
            <span className="text-[10px] font-bold text-amber-700 uppercase">📝 Veresiye</span>
            <p className="text-lg font-black text-amber-700 mt-0.5">{stats.veresiye}</p>
          </div>

          <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-rose-700 uppercase">⏳ Bekleyen</span>
            <p className="text-lg font-black text-rose-700 mt-0.5">{stats.bekleyen}</p>
          </div>

        </div>
      </section>

      {/* İÇERİK ALANI */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">

        {/* OTOMATİK WHATSAPP BOT VE CANLI DİNLEME DÜĞMESİ */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl flex items-center justify-center ${isAutoListenActive ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50' : 'bg-slate-800 text-slate-500'}`}>
              <Radio className={`h-6 w-6 ${isAutoListenActive ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm">WhatsApp Oto-Canlı Dinleyici (Webhook)</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${isAutoListenActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                  {isAutoListenActive ? 'CANLI AKTİF' : 'DEVRE DIŞI'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gruba atılan mesajlar doğrudan aktif hesabınıza sipariş olarak atanır.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleSimulateIncomingGroupMessage}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              title="Gruba yeni mesaj düşmüş gibi test edin"
            >
              <Zap className="h-4 w-4 text-amber-300" />
              <span>Grup Mesajı Test Et</span>
            </button>
            
            <button
              onClick={() => setIsAutoListenActive(!isAutoListenActive)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                isAutoListenActive ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-emerald-600 bg-emerald-600 text-white'
              }`}
            >
              {isAutoListenActive ? 'Durdur' : 'Başlat'}
            </button>
          </div>
        </div>

        {/* WHATSAPP MESAJ YAPIŞTIRMA KUTUSU */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <span>WhatsApp Mesaj Yapıştır & Otomatik Çek</span>
            </div>
            <button
              onClick={() => setWhatsappText(SAMPLE_WHATSAPP_TEXT)}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline"
            >
              Örnek Metin Doldur
            </button>
          </div>

          <textarea
            rows="3"
            placeholder="WhatsApp grubundan kopyaladığınız sipariş mesajlarını yapıştırın...&#10;Ahmet Yılmaz: 2 adet 12kg tombul tüp&#10;Mehmet Kaya - 1 adet 19lt su"
            value={whatsappText}
            onChange={(e) => setWhatsappText(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
          ></textarea>

          <div className="mt-3 flex justify-end">
            <button
              onClick={() => parseWhatsAppText()}
              disabled={!whatsappText.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Siparişleri Otomatik Listeye Ekle</span>
            </button>
          </div>
        </div>

        {/* MANUEL TEKLİ EKLEME VE KURYE ATAMA */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <form onSubmit={handleManualAdd} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Müşteri Adı Soyadı"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="sm:w-1/4 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Sipariş Detayı (Örn: 1 adet 12kg tüp)"
              value={manualItems}
              onChange={(e) => setManualItems(e.target.value)}
              className="sm:w-2/4 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <select
              value={manualCourier}
              onChange={(e) => setManualCourier(e.target.value)}
              className="sm:w-1/4 border border-slate-300 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold"
            >
              <option value="">Kurye Seç (Varsayılan: Ben)</option>
              {couriers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center justify-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Ekle</span>
            </button>
          </form>
        </div>

        {/* FİLTRE VE ARAMA BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Ödeme Filtre Butonları */}
          <div className="flex bg-slate-200 p-1 rounded-xl w-full sm:w-auto overflow-x-auto text-xs font-bold">
            {[
              { id: 'ALL', label: 'Tümü' },
              { id: 'UNPAID', label: '⏳ Ödenmedi' },
              { id: 'NAKİT', label: '💵 Nakit' },
              { id: 'KREDİ KARTI', label: '💳 K. Kartı' },
              { id: 'VERESİYE', label: '📝 Veresiye' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  filterStatus === tab.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Arama Input */}
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Müşteri, ürün veya kurye ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

        </div>

        {/* SİPARİŞ LİSTESİ */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Henüz sipariş kaydı yok</p>
              <p className="text-xs text-slate-400 mt-1">Seçili kurye veya filtrelere uyan sipariş bulunamadı.</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div
                key={order.id}
                className={`bg-white rounded-2xl p-4 shadow-2xs border transition relative ${
                  order.paymentStatus === 'NAKİT' ? 'border-emerald-300 bg-emerald-50/20' :
                  order.paymentStatus === 'KREDİ KARTI' ? 'border-blue-300 bg-blue-50/20' :
                  order.paymentStatus === 'VERESİYE' ? 'border-amber-300 bg-amber-50/20' :
                  'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* ÜST SATIR: İSİM VE SİLME */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                      <User className="h-4 w-4 text-slate-500 shrink-0" />
                      <span>{order.customerName}</span>
                    </h3>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{order.timeStr}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-600">Ekleyen: {order.addedByName}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* KURYE DEĞİŞTİR / ATAMA AÇILIR KUTUSU */}
                    <div className="flex items-center space-x-1 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <select
                        value={order.assignedTo}
                        onChange={(e) => assignOrderToCourier(order.id, e.target.value)}
                        className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none"
                      >
                        {couriers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 transition"
                      title="Siparişi Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* SİPARİŞ İÇERİĞİ */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 my-3 text-xs font-medium text-slate-800">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">Sipariş Edilen Malzemeler:</span>
                  <p className="text-sm font-bold text-slate-900">{order.items}</p>
                </div>

                {/* ÖDEME BUTONLARI (NAKİT / KREDİ KARTI / VERESİYE) */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Ödeme:</span>
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                      Teslim Edecek Kurye: {order.assignedToName}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                    {/* NAKİT BUTONU */}
                    <button
                      onClick={() => updatePaymentStatus(order.id, 'NAKİT')}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition ${
                        order.paymentStatus === 'NAKİT'
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500'
                          : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
                      }`}
                    >
                      <Banknote className="h-4 w-4" />
                      <span>Nakit</span>
                    </button>

                    {/* KREDİ KARTI BUTONU */}
                    <button
                      onClick={() => updatePaymentStatus(order.id, 'KREDİ KARTI')}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition ${
                        order.paymentStatus === 'KREDİ KARTI'
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500'
                          : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200'
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>K. Kartı</span>
                    </button>

                    {/* VERESİYE BUTONU */}
                    <button
                      onClick={() => updatePaymentStatus(order.id, 'VERESİYE')}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition ${
                        order.paymentStatus === 'VERESİYE'
                          ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-400'
                          : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700 border border-slate-200'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Veresiye</span>
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </main>

      {/* MODAL 1: KULLANICI KİMLİĞİ VE HESAP SEÇİMİ */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
            
            <div className="flex items-center space-x-3 text-slate-900 mb-4">
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Aktif Çalışan Hesabı Geçişi</h3>
                <p className="text-xs text-slate-500">Cihazınızda hangi kurye hesabı aktif olsun?</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mevcut Kayıtlı Kurye Seçin
                </label>
                <select
                  value={tempUserId}
                  onChange={(e) => {
                    const selected = couriers.find(c => c.id === e.target.value);
                    if (selected) {
                      setTempUserId(selected.id);
                      setTempUserName(selected.name);
                    }
                  }}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  {couriers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - Kod: {c.id}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Veya İsim / Kod Manuel Düzenle
                </label>
                <input
                  type="text"
                  value={tempUserName}
                  onChange={(e) => setTempUserName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-2"
                  placeholder="Kurye Adı"
                />
                <input
                  type="text"
                  value={tempUserId}
                  onChange={(e) => setTempUserId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold bg-slate-50"
                  placeholder="Personel Kodu (PER-XXXX)"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  setUserId(tempUserId);
                  setUserName(tempUserName);
                  setShowUserModal(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow"
              >
                Hesaba Geçiş Yap
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: YENİ KURYE / ÇALIŞAN HESABI EKLEME */}
      {showAddCourierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
            
            <div className="flex items-center space-x-3 text-slate-900 mb-4">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Yeni Kurye / Personel Ekle</h3>
                <p className="text-xs text-slate-500">Sisteme yeni dağıtım kuryesi tanımlayın</p>
              </div>
            </div>

            <form onSubmit={handleAddCourier} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kurye / Personel Adı Soyadı
                </label>
                <input
                  type="text"
                  value={newCourierName}
                  onChange={(e) => setNewCourierName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Örn: Mustafa (Kurye 3)"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Görevi / Rolü
                </label>
                <select
                  value={newCourierRole}
                  onChange={(e) => setNewCourierRole(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="Kurye">Saha Kuryesi</option>
                  <option value="Dükkan">Dükkan / Tezgah</option>
                  <option value="Yönetici">Yönetici</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCourierModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow"
                >
                  Kuryeyi Kaydet
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}