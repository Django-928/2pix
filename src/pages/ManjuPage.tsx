import { useState } from 'react';
import AppQuickNav from '@/components/layout/AppQuickNav';
import {
  Play,
  Plus,
  Trash2,
  Download,
  Film,
  Image as ImageIcon,
  User,
  Wand2,
  Upload,
  Layers,
  RefreshCw,
  Type,
  GripVertical,
} from 'lucide-react';

/* ─── 类型 ─── */
interface Character {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  voice: string;
}

interface Shot {
  id: string;
  scene: string;
  action: string;
  dialogue: string;
  characterId: string;
  imageUrl?: string;
  videoUrl?: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  duration: number;
}

/* ─── 模拟数据 ─── */
const demoCharacters: Character[] = [
  { id: 'c1', name: '小北', avatar: '👦', personality: '活泼开朗，好奇心强', voice: '少年音' },
  { id: 'c2', name: '阿花', avatar: '👧', personality: '温柔善良，善解人意', voice: '少女音' },
];

const demoShots: Shot[] = [
  {
    id: 's1',
    scene: '清晨的校园',
    action: '小北背着书包走进校门',
    dialogue: '又是新的一天！',
    characterId: 'c1',
    status: 'done',
    duration: 5,
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
  },
  {
    id: 's2',
    scene: '教室走廊',
    action: '阿花在窗边看书',
    dialogue: '这本小说真好看...',
    characterId: 'c2',
    status: 'done',
    duration: 4,
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop',
  },
  {
    id: 's3',
    scene: '操场',
    action: '两人在操场相遇',
    dialogue: '早啊阿花！',
    characterId: 'c1',
    status: 'pending',
    duration: 6,
  },
];

/* ─── 组件 ─── */
export default function ManjuPage() {
  const [characters, setCharacters] = useState<Character[]>(demoCharacters);
  const [shots, setShots] = useState<Shot[]>(demoShots);
  const [activeTab, setActiveTab] = useState<'script' | 'characters' | 'shots' | 'preview'>('script');
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState('第一集：初次相遇\n\n场景1：清晨的校园\n小北背着书包走进校门，阳光洒在他的脸上。\n小北：又是新的一天！\n\n场景2：教室走廊\n阿花在窗边看书，风吹过她的发梢。\n阿花：这本小说真好看...\n\n场景3：操场\n小北跑向阿花，挥手打招呼。\n小北：早啊阿花！\n阿花：早！你今天来得真早。');
  const [showAddChar, setShowAddChar] = useState(false);
  const [newChar, setNewChar] = useState({ name: '', personality: '', voice: '少年音' });

  const selectedShot = shots.find((s) => s.id === selectedShotId);

  /* 添加角色 */
  const handleAddCharacter = () => {
    if (!newChar.name.trim()) return;
    const char: Character = {
      id: `c${Date.now()}`,
      name: newChar.name,
      avatar: '👤',
      personality: newChar.personality,
      voice: newChar.voice,
    };
    setCharacters((prev) => [...prev, char]);
    setNewChar({ name: '', personality: '', voice: '少年音' });
    setShowAddChar(false);
  };

  /* 删除角色 */
  const handleDeleteCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  /* 添加分镜 */
  const handleAddShot = () => {
    const shot: Shot = {
      id: `s${Date.now()}`,
      scene: '新场景',
      action: '角色动作描述',
      dialogue: '',
      characterId: characters[0]?.id || '',
      status: 'pending',
      duration: 5,
    };
    setShots((prev) => [...prev, shot]);
    setSelectedShotId(shot.id);
    setActiveTab('shots');
  };

  /* 删除分镜 */
  const handleDeleteShot = (id: string) => {
    setShots((prev) => prev.filter((s) => s.id !== id));
    if (selectedShotId === id) setSelectedShotId(null);
  };

  /* 更新分镜 */
  const handleUpdateShot = (id: string, updates: Partial<Shot>) => {
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  /* 生成分镜 */
  const handleGenerateShot = async (shotId: string) => {
    handleUpdateShot(shotId, { status: 'generating' });
    await new Promise((r) => setTimeout(r, 2000));
    handleUpdateShot(shotId, {
      status: 'done',
      imageUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000000)}?w=400&h=300&fit=crop`,
    });
  };

  /* 批量生成 */
  const handleGenerateAll = async () => {
    const pending = shots.filter((s) => s.status === 'pending');
    for (const shot of pending) {
      await handleGenerateShot(shot.id);
    }
  };

  /* 从剧本解析分镜 */
  const handleParseScript = () => {
    // 简化的解析逻辑
    const lines = scriptText.split('\n').filter((l) => l.trim());
    const newShots: Shot[] = [];
    let currentScene = '';
    let currentAction = '';
    let currentDialogue = '';
    let currentChar = characters[0]?.id || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('场景')) {
        if (currentScene) {
          newShots.push({
            id: `s${Date.now()}_${newShots.length}`,
            scene: currentScene,
            action: currentAction,
            dialogue: currentDialogue,
            characterId: currentChar,
            status: 'pending',
            duration: 5,
          });
        }
        currentScene = trimmed.replace(/^场景\d*[:：]?\s*/, '');
        currentAction = '';
        currentDialogue = '';
      } else if (trimmed.includes('：') || trimmed.includes(':')) {
        const [name, text] = trimmed.split(/[：:]/);
        const char = characters.find((c) => c.name === name.trim());
        if (char) currentChar = char.id;
        currentDialogue = text.trim();
      } else if (trimmed) {
        currentAction = trimmed;
      }
    }

    if (currentScene) {
      newShots.push({
        id: `s${Date.now()}_${newShots.length}`,
        scene: currentScene,
        action: currentAction,
        dialogue: currentDialogue,
        characterId: currentChar,
        status: 'pending',
        duration: 5,
      });
    }

    if (newShots.length > 0) {
      setShots(newShots);
      setActiveTab('shots');
    }
  };

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* 顶部栏 */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-4 py-3 border-b border-white/[0.08] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center">
            <Film className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#e5e5e5]">漫剧工坊</h1>
            <p className="text-[10px] text-[#666]">AI 剧本分镜视频生成</p>
          </div>
        </div>

        <div className="w-full lg:w-auto flex items-center justify-between gap-2">
          <AppQuickNav compact />
          <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white text-xs font-medium hover:opacity-90 transition-all"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>批量生成</span>
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#262626] border border-white/[0.06] text-[#999] text-xs hover:bg-[#333] transition-all">
            <Download className="w-3.5 h-3.5" />
            <span>导出</span>
          </button>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <div className="flex-1 flex min-h-0 overflow-x-auto">
        {/* 左侧导航 */}
        <div className="w-14 flex-shrink-0 border-r border-white/[0.08] flex flex-col items-center py-4 gap-2">
          {[
            { id: 'script' as const, icon: Type, label: '剧本' },
            { id: 'characters' as const, icon: User, label: '角色' },
            { id: 'shots' as const, icon: Layers, label: '分镜' },
            { id: 'preview' as const, icon: Play, label: '预览' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                activeTab === item.id
                  ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]'
                  : 'text-[#666] hover:text-[#999] hover:bg-white/5'
              }`}
              title={item.label}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[9px]">{item.label}</span>
            </button>
          ))}
        </div>

        {/* 中间内容区 */}
        <div className="flex-1 min-w-0 flex">
          {/* 左侧面板 */}
          <div className="w-[380px] flex-shrink-0 border-r border-white/[0.08] flex flex-col">
            {/* 剧本面板 */}
            {activeTab === 'script' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                  <h2 className="text-sm font-medium text-[#e5e5e5]">剧本编辑</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleParseScript}
                      className="px-3 py-1.5 rounded-lg bg-[#8b5cf6]/20 text-[#8b5cf6] text-xs hover:bg-[#8b5cf6]/30 transition-all"
                    >
                      解析分镜
                    </button>
                    <button className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-white/5 transition-all">
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <textarea
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    className="w-full h-full bg-[#1c1c1c] border border-white/[0.08] rounded-xl p-4 text-sm text-[#e5e5e5] placeholder-[#555] resize-none outline-none focus:border-[#8b5cf6]/30"
                    placeholder="输入剧本内容，格式：&#10;场景1：场景描述&#10;角色动作&#10;角色名：台词"
                  />
                </div>
              </div>
            )}

            {/* 角色面板 */}
            {activeTab === 'characters' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                  <h2 className="text-sm font-medium text-[#e5e5e5]">角色设定</h2>
                  <button
                    onClick={() => setShowAddChar(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8b5cf6]/20 text-[#8b5cf6] text-xs hover:bg-[#8b5cf6]/30 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加角色
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {characters.map((char) => (
                    <div key={char.id} className="p-3 rounded-xl bg-[#1c1c1c] border border-white/[0.08]">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{char.avatar}</span>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-[#e5e5e5]">{char.name}</h3>
                          <p className="text-xs text-[#666]">{char.voice}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteCharacter(char.id)}
                          className="p-1.5 rounded-lg text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-[#888]">{char.personality}</p>
                    </div>
                  ))}

                  {showAddChar && (
                    <div className="p-3 rounded-xl bg-[#1c1c1c] border border-[#8b5cf6]/20">
                      <input
                        value={newChar.name}
                        onChange={(e) => setNewChar((p) => ({ ...p, name: e.target.value }))}
                        placeholder="角色名称"
                        className="w-full px-3 py-2 rounded-lg bg-[#262626] border border-white/[0.06] text-sm text-[#e5e5e5] placeholder-[#555] outline-none focus:border-[#8b5cf6]/30 mb-2"
                      />
                      <input
                        value={newChar.personality}
                        onChange={(e) => setNewChar((p) => ({ ...p, personality: e.target.value }))}
                        placeholder="性格描述"
                        className="w-full px-3 py-2 rounded-lg bg-[#262626] border border-white/[0.06] text-sm text-[#e5e5e5] placeholder-[#555] outline-none focus:border-[#8b5cf6]/30 mb-2"
                      />
                      <select
                        value={newChar.voice}
                        onChange={(e) => setNewChar((p) => ({ ...p, voice: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-[#262626] border border-white/[0.06] text-sm text-[#e5e5e5] outline-none mb-3"
                      >
                        <option>少年音</option>
                        <option>少女音</option>
                        <option>成熟男声</option>
                        <option>成熟女声</option>
                        <option>儿童音</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddCharacter}
                          className="flex-1 py-2 rounded-lg bg-[#8b5cf6] text-white text-xs font-medium hover:opacity-90 transition-all"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => setShowAddChar(false)}
                          className="flex-1 py-2 rounded-lg bg-[#262626] text-[#999] text-xs hover:bg-[#333] transition-all"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 分镜面板 */}
            {activeTab === 'shots' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                  <h2 className="text-sm font-medium text-[#e5e5e5]">分镜列表</h2>
                  <button
                    onClick={handleAddShot}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8b5cf6]/20 text-[#8b5cf6] text-xs hover:bg-[#8b5cf6]/30 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加分镜
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {shots.map((shot, idx) => (
                    <div
                      key={shot.id}
                      onClick={() => setSelectedShotId(shot.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedShotId === shot.id
                          ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/30'
                          : 'bg-[#1c1c1c] border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical className="w-3.5 h-3.5 text-[#555]" />
                        <span className="text-[10px] text-[#666]">#{idx + 1}</span>
                        <span className="text-xs font-medium text-[#e5e5e5] flex-1 truncate">{shot.scene}</span>
                        <span
                          className={`text-[10px] px-1.5 rounded-full ${
                            shot.status === 'done'
                              ? 'bg-green-500/20 text-green-400'
                              : shot.status === 'generating'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-[#555]/20 text-[#888]'
                          }`}
                        >
                          {shot.status === 'done' ? '完成' : shot.status === 'generating' ? '生成中' : '待生成'}
                        </span>
                      </div>
                      <p className="text-xs text-[#888] line-clamp-2 mb-1">{shot.action}</p>
                      {shot.dialogue && (
                        <p className="text-xs text-[#8b5cf6]">「{shot.dialogue}」</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 预览面板 */}
            {activeTab === 'preview' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-white/[0.08]">
                  <h2 className="text-sm font-medium text-[#e5e5e5]">剧集预览</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {shots.map((shot, idx) => (
                      <div key={shot.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#262626] flex items-center justify-center text-xs text-[#666]">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          {shot.imageUrl ? (
                            <img src={shot.imageUrl} alt={shot.scene} className="w-full rounded-xl mb-2" />
                          ) : (
                            <div className="w-full h-32 rounded-xl bg-[#1c1c1c] border border-white/[0.08] flex items-center justify-center text-[#555] text-xs mb-2">
                              待生成
                            </div>
                          )}
                          <p className="text-xs text-[#888]">{shot.scene}</p>
                          {shot.dialogue && (
                            <p className="text-xs text-[#8b5cf6] mt-1">「{shot.dialogue}」</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 右侧编辑/预览区 */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedShot && activeTab === 'shots' ? (
              <>
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                  <h2 className="text-sm font-medium text-[#e5e5e5]">分镜编辑：{selectedShot.scene}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerateShot(selectedShot.id)}
                      disabled={selectedShot.status === 'generating'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {selectedShot.status === 'generating' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" />
                      )}
                      {selectedShot.status === 'generating' ? '生成中' : '生成分镜'}
                    </button>
                    <button
                      onClick={() => handleDeleteShot(selectedShot.id)}
                      className="p-1.5 rounded-lg text-[#666] hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="max-w-xl mx-auto space-y-4">
                    {/* 预览图 */}
                    <div className="rounded-xl bg-[#1c1c1c] border border-white/[0.08] overflow-hidden">
                      {selectedShot.imageUrl ? (
                        <img src={selectedShot.imageUrl} alt={selectedShot.scene} className="w-full" />
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-[#555]">
                          <ImageIcon className="w-12 h-12 mb-2" />
                          <p className="text-xs">点击"生成分镜"生成画面</p>
                        </div>
                      )}
                    </div>

                    {/* 编辑表单 */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-[#888] mb-1 block">场景</label>
                        <input
                          value={selectedShot.scene}
                          onChange={(e) => handleUpdateShot(selectedShot.id, { scene: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-sm text-[#e5e5e5] outline-none focus:border-[#8b5cf6]/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#888] mb-1 block">动作</label>
                        <textarea
                          value={selectedShot.action}
                          onChange={(e) => handleUpdateShot(selectedShot.id, { action: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-sm text-[#e5e5e5] outline-none focus:border-[#8b5cf6]/30 resize-none"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#888] mb-1 block">台词</label>
                        <input
                          value={selectedShot.dialogue}
                          onChange={(e) => handleUpdateShot(selectedShot.id, { dialogue: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-sm text-[#e5e5e5] outline-none focus:border-[#8b5cf6]/30"
                          placeholder="角色台词"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#888] mb-1 block">角色</label>
                        <select
                          value={selectedShot.characterId}
                          onChange={(e) => handleUpdateShot(selectedShot.id, { characterId: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-sm text-[#e5e5e5] outline-none"
                        >
                          {characters.map((char) => (
                            <option key={char.id} value={char.id}>
                              {char.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-[#888] mb-1 block">时长（秒）</label>
                        <input
                          type="number"
                          value={selectedShot.duration}
                          onChange={(e) => handleUpdateShot(selectedShot.id, { duration: parseInt(e.target.value) || 5 })}
                          className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c] border border-white/[0.08] text-sm text-[#e5e5e5] outline-none focus:border-[#8b5cf6]/30"
                          min={1}
                          max={30}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[#555]">
                <Film className="w-16 h-16 mb-4" />
                <p className="text-sm">选择分镜进行编辑</p>
                <p className="text-xs mt-1">或切换到剧本/角色面板开始创作</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
