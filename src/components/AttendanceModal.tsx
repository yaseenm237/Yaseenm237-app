import React, { useState, useEffect } from "react";
import {
  Language,
  Worker,
  AttendanceRecord,
  AttendanceSettings,
} from "../types";
import {
  X,
  Users,
  Calendar,
  PlusCircle,
  CheckCircle,
  Smartphone,
  Info,
  Share2,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  attendanceData: AttendanceSettings;
  onUpdateData: (data: AttendanceSettings) => void;
}

export default function AttendanceModal({
  isOpen,
  onClose,
  language,
  attendanceData,
  onUpdateData,
}: AttendanceModalProps) {
  const isHindi = language === "Hindi";
  const [activeTab, setActiveTab] = useState<"contractor" | "worker">(
    "contractor",
  );

  // Contractor states
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerPhone, setNewWorkerPhone] = useState("");
  const [newWorkerWage, setNewWorkerWage] = useState("");
  const [selectedWorkerForQR, setSelectedWorkerForQR] = useState<Worker | null>(
    null,
  );

  // Worker view state
  const [workerAuthPayload, setWorkerAuthPayload] = useState<{
    w: string;
    n: string;
    cp: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workerAuth = params.get("workerAuth");
    if (workerAuth) {
      try {
        const payload = JSON.parse(atob(workerAuth));
        setWorkerAuthPayload(payload);
      } catch (e) {
        console.error("Invalid worker auth link");
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddWorker = () => {
    if (!newWorkerName || !newWorkerPhone) return;
    const newWorker: Worker = {
      id: `w-${Date.now()}`,
      name: newWorkerName,
      phone: newWorkerPhone,
      wage: parseFloat(newWorkerWage) || 0,
      createdAt: Date.now(),
    };
    onUpdateData({
      ...attendanceData,
      workers: [...(attendanceData.workers || []), newWorker],
    });
    setNewWorkerName("");
    setNewWorkerPhone("");
    setNewWorkerWage("");
    setShowAddWorker(false);
  };

  const getWorkerLink = (worker: Worker) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const payload = btoa(
      JSON.stringify({
        w: worker.id,
        n: worker.name,
        cp: attendanceData.contractorPhone || "",
      }),
    );
    return `${baseUrl}?workerAuth=${payload}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(isHindi ? "लिंक कॉपी हो गया!" : "Link copied!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "P":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "H":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "A":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "P":
        return isHindi ? "उपस्थित (Present)" : "Present";
      case "H":
        return isHindi ? "हाफ डे (Half Day)" : "Half Day";
      case "A":
        return isHindi ? "अनुपस्थित (Absent)" : "Absent";
      default:
        return status;
    }
  };

  const handleSendAttendance = (status: "P" | "H" | "A") => {
    if (!workerAuthPayload) return;
    const today = new Date().toISOString().split("T")[0];
    const payload = btoa(
      JSON.stringify({
        w: workerAuthPayload.w,
        s: status,
        d: today,
        t: Date.now(),
      }),
    );
    const baseUrl = window.location.origin + window.location.pathname;
    const link = `${baseUrl}?recordAttendance=${payload}`;
    const text = isHindi
      ? `नमस्ते, मेरी आज (${today}) की हाजिरी दर्ज करें। लिंक पर क्लिक करें:\n${link}`
      : `Hello, please mark my attendance for today (${today}). Click the link to record:\n${link}`;
    window.open(
      `https://wa.me/${workerAuthPayload.cp}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-50 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">
                {isHindi
                  ? "हाजिरी पायलट (Hajiri Pilot)"
                  : "Hajiri Pilot (Attendance)"}
              </h2>
              <p className="text-xs font-medium text-slate-500">
                {isHindi
                  ? "मजदूरों की स्मार्ट अटेंडेंस प्रणाली"
                  : "Smart Worker Attendance System"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {workerAuthPayload ? (
            <div className="max-w-md mx-auto text-center space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-1">
                  {workerAuthPayload.n}
                </h3>
                <p className="text-sm font-medium text-slate-500 mb-6">
                  {isHindi
                    ? "आज की हाजिरी लगाएं"
                    : "Mark your attendance for today"}
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => handleSendAttendance("P")}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black text-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={24} />
                    {isHindi ? "पूरी हाजिरी (Present)" : "Full Day (Present)"}
                  </button>
                  <button
                    onClick={() => handleSendAttendance("H")}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-black text-lg transition-all shadow-md active:scale-95"
                  >
                    {isHindi ? "हाफ डे (Half Day)" : "Half Day"}
                  </button>
                  <button
                    onClick={() => handleSendAttendance("A")}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-xl font-black text-lg transition-all shadow-md active:scale-95"
                  >
                    {isHindi ? "छुट्टी (Absent)" : "Absent"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                <Info size={14} />
                {isHindi
                  ? "यह ठेकेदार को व्हाट्सएप मैसेज भेजेगा"
                  : "This will send a WhatsApp message to the contractor"}
              </p>
            </div>
          ) : !attendanceData.contractorPhone ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-md mx-auto text-center space-y-4">
              <Smartphone size={48} className="mx-auto text-indigo-500" />
              <h3 className="text-lg font-bold text-slate-800">
                {isHindi
                  ? "अपना मोबाइल नंबर दर्ज़ करें"
                  : "Enter Your Mobile Number"}
              </h3>
              <p className="text-sm text-slate-500">
                {isHindi
                  ? "ठेकेदार (Contractor) के रूप में, मजदूर आपको इसी नंबर पर व्हाट्सएप द्वारा हाजिरी भेजेंगे।"
                  : "As a contractor, workers will send their attendance via WhatsApp to this number."}
              </p>
              <input
                type="tel"
                placeholder="e.g. 919876543210 (with country code)"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onUpdateData({
                      ...attendanceData,
                      contractorPhone: e.currentTarget.value,
                    });
                  }
                }}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 p-1 bg-slate-200 rounded-xl">
                  <button
                    onClick={() => setActiveTab("contractor")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      activeTab === "contractor"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    {isHindi ? "ठेकेदार डैशबोर्ड" : "Contractor Dashboard"}
                  </button>
                </div>

                <button
                  onClick={() => setShowAddWorker(!showAddWorker)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
                >
                  <PlusCircle size={16} />
                  {isHindi ? "नया मजदूर जोड़ें" : "Add Worker"}
                </button>
              </div>

              {/* Add Worker Form */}
              {showAddWorker && (
                <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-4">
                    {isHindi ? "मजदूर का विवरण" : "Worker Details"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {isHindi ? "नाम" : "Name"}
                      </label>
                      <input
                        type="text"
                        value={newWorkerName}
                        onChange={(e) => setNewWorkerName(e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="e.g. Raju"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {isHindi ? "फोन नंबर" : "Phone"}
                      </label>
                      <input
                        type="tel"
                        value={newWorkerPhone}
                        onChange={(e) => setNewWorkerPhone(e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="e.g. 9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {isHindi ? "दिहाड़ी (₹)" : "Daily Wage (₹)"}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={newWorkerWage}
                          onChange={(e) => setNewWorkerWage(e.target.value)}
                          className="w-full p-2 border rounded-lg text-sm"
                          placeholder="e.g. 500"
                        />
                        <button
                          onClick={handleAddWorker}
                          className="bg-indigo-600 text-white px-4 rounded-lg font-bold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Workers List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 flex justify-between">
                    <span>{isHindi ? "मजदूरों की सूची" : "Workers List"}</span>
                    <span className="text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full text-xs">
                      {attendanceData.workers?.length || 0}
                    </span>
                  </div>

                  {attendanceData.workers?.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {attendanceData.workers.map((worker) => (
                        <div
                          key={worker.id}
                          className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-800">
                              {worker.name}
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                              ₹{worker.wage} / day • {worker.phone}
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedWorkerForQR(worker)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                          >
                            <QrCode size={16} />
                            {isHindi ? "ऐप सेटअप" : "Setup App"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      {isHindi
                        ? "कोई मजदूर नहीं जोड़ा गया है"
                        : "No workers added yet"}
                    </div>
                  )}
                </div>

                {/* Attendance Log */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">
                    {isHindi ? "हाजिरी लॉग (आज)" : "Attendance Log (Today)"}
                  </div>

                  {attendanceData.records?.length > 0 ? (
                    <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                      {attendanceData.records
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((record) => {
                          const worker = attendanceData.workers?.find(
                            (w) => w.id === record.workerId,
                          );
                          return (
                            <div
                              key={record.id}
                              className="p-4 flex items-center justify-between"
                            >
                              <div>
                                <div className="font-bold text-slate-800">
                                  {worker?.name || "Unknown"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {new Date(record.timestamp).toLocaleString()}
                                </div>
                              </div>
                              <div
                                className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusColor(record.status)}`}
                              >
                                {getStatusText(record.status)}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      {isHindi
                        ? "आज कोई हाजिरी नहीं"
                        : "No attendance recorded today"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* QR Code Modal for Worker Setup */}
          {selectedWorkerForQR && (
            <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-slate-800">
                    {isHindi
                      ? "ट्रस्ट सेटअप (Trust Setup)"
                      : "Worker Trust Setup"}
                  </h3>
                  <button
                    onClick={() => setSelectedWorkerForQR(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl inline-block border border-slate-200">
                  <QRCodeSVG
                    value={getWorkerLink(selectedWorkerForQR)}
                    size={200}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800">
                    {isHindi
                      ? `${selectedWorkerForQR.name} के फोन से इसे स्कैन करें`
                      : `Scan this from ${selectedWorkerForQR.name}'s phone`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isHindi
                      ? "या उनके व्हाट्सएप पर सेटअप लिंक भेजें:"
                      : "Or share the setup link via WhatsApp:"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        copyToClipboard(getWorkerLink(selectedWorkerForQR))
                      }
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                      Copy Link
                    </button>
                    <a
                      href={`https://wa.me/${selectedWorkerForQR.phone}?text=${encodeURIComponent(`Here is your Hajiri App link: ${getWorkerLink(selectedWorkerForQR)}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <Share2 size={16} /> WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
