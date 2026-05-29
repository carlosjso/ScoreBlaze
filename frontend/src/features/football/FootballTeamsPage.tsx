import { useState, useRef } from "react";
import { 
  Shield, 
  Search, 
  Plus, 
  UsersRound, 
  Settings, 
  Shirt, 
  Upload, 
  Mail, 
  Phone, 
  User, 
  X, 
  ArrowUpDown,
  Trash2,
  Edit2,
  FolderPlus,
  Check
} from "lucide-react";
import { cn } from "@/shared/utils/cn";

type Team = {
  id: string;
  name: string;
  manager: string;
  phone: string;
  email: string;
  category: string;
  playersCount: number;
  logoUrl?: string;
};

export function FootballTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"id" | "name" | "players">("name");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    manager: "",
    phone: "",
    email: "",
    category: "futbol 7"
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const filteredTeams = teams
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "id") return Number(a.id) - Number(b.id);
      if (sortBy === "players") return b.playersCount - a.playersCount;
      return 0;
    });

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingTeamId) {
      setTeams(teams.map(t => t.id === editingTeamId ? {
        ...t,
        name: formData.name,
        manager: formData.manager,
        phone: formData.phone,
        email: formData.email,
        category: formData.category,
        logoUrl: logoPreview || t.logoUrl
      } : t));
    } else {
      const newTeam: Team = {
        id: String(teams.length + 11),
        name: formData.name,
        manager: formData.manager,
        phone: formData.phone,
        email: formData.email,
        category: formData.category,
        playersCount: 0,
        logoUrl: logoPreview || undefined
      };
      setTeams([...teams, newTeam]);
    }
    closeModal();
  };

  const openEditModal = (team: Team) => {
    setEditingTeamId(team.id);
    setFormData({
      name: team.name,
      manager: team.manager,
      phone: team.phone,
      email: team.email,
      category: team.category
    });
    setLogoPreview(team.logoUrl || null);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDeleteTeam = (id: string) => {
    setTeams(teams.filter(t => t.id !== id));
    setActiveMenuId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeamId(null);
    setLogoPreview(null);
    setFormData({ name: "", manager: "", phone: "", email: "", category: "futbol 7" });
  };

  return (
    <div className="sb-page min-h-screen bg-[#fafafa] selection:bg-orange-100 selection:text-orange-950">
      <div className="sb-page-shell max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
        
        {/* ENCABEZADO CON TIPOGRAFÍA IMPACTANTE */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-8">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase">Football Module</span>
            </div>
            <h2 className="text-[44px] font-black tracking-tighter text-slate-900 uppercase mt-0.5">
              Equipos<span className="text-orange-500">.</span>
            </h2>
          </div>
          
          {/* Input de búsqueda estilizado estilo cápsula */}
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400"><Search size={16} /></span>
            <input
              type="text"
              placeholder="Buscar por club o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-2xl border border-slate-200 bg-white text-[13px] font-semibold shadow-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all"
            />
          </div>
        </div>

        {/* CONTROLES DE FILTRADO Y BOTÓN REGISTRAR */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5 rounded-[28px] border border-slate-200/70 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">Filtros</span>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40">
              <button 
                onClick={() => setSortBy("name")}
                className={cn("h-8 px-4 rounded-lg text-[12px] font-black transition-all", sortBy === "name" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}
              >
                Nombre
              </button>
              <button 
                onClick={() => setSortBy("id")}
                className={cn("h-8 px-4 rounded-lg text-[12px] font-black transition-all flex items-center gap-1", sortBy === "id" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}
              >
                ID <ArrowUpDown size={11} />
              </button>
              <button 
                onClick={() => setSortBy("players")}
                className={cn("h-8 px-4 rounded-lg text-[12px] font-black transition-all flex items-center gap-1", sortBy === "players" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-900")}
              >
                Plantilla <ArrowUpDown size={11} />
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="h-11 px-5 rounded-2xl bg-slate-950 text-white flex items-center gap-2 text-[12px] font-black uppercase tracking-widest hover:bg-orange-600 shadow-lg shadow-slate-950/5 transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={3} /> Nuevo Equipo
          </button>
        </div>

        {/* SECCIÓN PRINCIPAL DE TARJETA O CONTENEDOR VACÍO */}
        {filteredTeams.length === 0 ? (
          /* Rediseño radical del empty state: se ve increíblemente pro */
          <div className="relative overflow-hidden flex flex-col items-center justify-center min-h-[360px] rounded-[36px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            {/* Círculos difuminados estéticos de fondo */}
            <div className="absolute top-[-20%] left-[-10%] h-64 w-64 rounded-full bg-orange-400/5 blur-3xl pointer-events-none" />
            
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 mb-4 shadow-sm">
              <FolderPlus size={26} />
            </div>
            <h3 className="text-[20px] font-black text-slate-900 tracking-tight">Consola de Equipos Vacía</h3>
            <p className="text-[13px] text-slate-400 font-medium max-w-[320px] mt-2 leading-relaxed">
              No hay clubes dados de alta en este momento. Presiona el botón superior para inicializar el primer registro.
            </p>
          </div>
        ) : (
          /* Grid Bento de Tarjetas de Equipos */
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-fade-in">
            {filteredTeams.map((team) => (
              <div 
                key={team.id}
                className="group relative flex flex-col items-center justify-between min-h-[240px] rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.01)] transition-all duration-500 cubic-bezier(0.16,1,0.3,1) hover:-translate-y-1.5 hover:border-orange-500/20 hover:shadow-[0_24px_48px_rgba(249,115,22,0.06)]"
              >
                {/* ID del equipo en la esquina */}
                <span className="absolute top-5 left-6 text-[10px] font-black text-slate-400 tracking-widest uppercase">#{team.id}</span>

                {/* Acciones contextuales exactas de tu imagen image_2c757f.png */}
                <div className="absolute top-4 right-5 flex items-center gap-1.5">
                  <button className="h-8 w-8 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-400 flex items-center justify-center hover:bg-orange-50 hover:text-orange-600 transition-all shadow-sm">
                    <Shirt size={14} />
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === team.id ? null : team.id)}
                      className={cn("h-8 w-8 rounded-xl border flex items-center justify-center shadow-sm transition-all", activeMenuId === team.id ? "bg-orange-500 border-orange-500 text-white" : "border-slate-100 bg-slate-50/50 text-slate-400 hover:bg-slate-100")}
                    >
                      <Settings size={14} />
                    </button>

                    {/* Menú desplegable flotante de tu captura */}
                    {activeMenuId === team.id && (
                      <div className="absolute right-0 mt-1.5 w-32 rounded-xl border border-slate-200/60 bg-white p-1 shadow-2xl z-30 animate-fade-in">
                        <button 
                          onClick={() => openEditModal(team)}
                          className="w-full h-9 px-2 rounded-lg text-left text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Edit2 size={12} /> Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteTeam(team.id)}
                          className="w-full h-9 px-2 rounded-lg text-left text-[12px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50"
                        >
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Escudo con halo de profundidad reactivo */}
                <div className="mt-8 relative flex h-24 w-24 items-center justify-center rounded-full bg-white border border-slate-100 p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden transition-transform duration-500 group-hover:scale-105">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <Shield size={36} className="text-slate-300 transition-colors duration-300 group-hover:text-orange-500" />
                  )}
                </div>

                {/* Título e indicador de plantilla */}
                <div className="w-full text-center mt-4">
                  <span className="block text-[19px] font-black text-slate-900 tracking-tight leading-none truncate px-2">{team.name}</span>
                  
                  <div className="mt-4 flex justify-center">
                    <span className={cn(
                      "inline-flex h-6 items-center gap-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm",
                      team.playersCount > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50/70 text-slate-400 border-slate-100"
                    )}>
                      <UsersRound size={11} />
                      {team.playersCount > 0 ? `${team.playersCount} Activos` : "Sin jugadores"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL COMPLETAMENTE REDISEÑADO AL ESTILO HIGH-FIDELITY SAAS */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="w-full max-w-[450px] bg-white rounded-[36px] border border-slate-100 p-8 shadow-2xl relative flex flex-col gap-6 animate-scale-up">
              
              {/* Botón de cierre circular */}
              <button 
                onClick={closeModal}
                className="absolute top-6 right-6 h-8 w-8 rounded-full bg-slate-50 border border-slate-200/40 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all"
              >
                <X size={14} strokeWidth={2.5} />
              </button>

              <div>
                <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase">Fútbol Base</span>
                <h3 className="text-[26px] font-black text-slate-900 tracking-tighter mt-0.5">
                  {editingTeamId ? "Modificar Club" : "Registrar Club"}
                </h3>
              </div>

              <form onSubmit={handleSaveTeam} className="flex flex-col gap-4">
                
                {/* Área del logotipo súper pulida y estética */}
                <div className="group relative flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/50 py-5 transition-all hover:bg-orange-50/10 hover:border-orange-500/30">
                  <div className="relative h-16 w-16 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner font-black text-slate-400 text-lg transition-transform duration-300 group-hover:scale-105">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <Shield size={22} className="text-slate-300" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleLogoChange} 
                    className="hidden" 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 h-7 rounded-xl border border-slate-200 bg-white text-[11px] font-black text-slate-700 hover:border-orange-400 hover:text-orange-600 transition-all shadow-sm"
                  >
                    <Upload size={11} strokeWidth={2.5} /> {logoPreview ? "Cambiar Imagen" : "Cargar Logotipo"}
                  </button>
                </div>

                {/* Campos con Enfoque de Línea Fina y Sombra de Anillo */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Nombre del equipo</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-slate-400"><Shield size={14} /></span>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. Real Hidalgo FC"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/30 text-[13px] font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Nombre del responsable</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-slate-400"><User size={14} /></span>
                    <input 
                      type="text" 
                      placeholder="Ej. Platano Alvarado"
                      value={formData.manager}
                      onChange={(e) => setFormData({...formData, manager: e.target.value})}
                      className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/30 text-[13px] font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Teléfono móvil</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-4 flex items-center text-slate-400"><Phone size={14} /></span>
                      <input 
                        type="text" 
                        placeholder="771 177 7344"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/30 text-[13px] font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Categoría Oficial</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/30 text-[13px] font-bold text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none"
                    >
                      <option value="futbol 7">Futbol 7</option>
                      <option value="futbol 11">Futbol 11</option>
                      <option value="futsal">Futsal</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Correo electrónico</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-slate-400"><Mail size={14} /></span>
                    <input 
                      type="email" 
                      placeholder="ejemplo@scoreblaze.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/30 text-[13px] font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all"
                    />
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed text-slate-400 font-medium bg-slate-50 rounded-xl p-3 border border-slate-100">
                  Se creará una cuenta pendiente y se enviará una invitación al responsable con rol de coach.
                </p>

                {/* Botonera inferior de confirmación */}
                <div className="mt-2 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button 
                    type="button"
                    onClick={closeModal}
                    className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-[13px] hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="h-11 px-6 rounded-xl bg-slate-950 text-white font-black text-[12px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-md active:scale-95 flex items-center gap-2"
                  >
                    <Check size={14} strokeWidth={3} /> {editingTeamId ? "Actualizar" : "Registrar"}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}