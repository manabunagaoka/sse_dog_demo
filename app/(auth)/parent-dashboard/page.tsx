'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signOut } from 'next-auth/react';

interface Child {
  id: string;
  name: string;
  age: number;
  vocabularyLevel: string;
  aiVoiceEnabled: boolean;
}

interface Session {
  id: string;
  scenario: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  utterances: { id: string }[];
}

export default function ParentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [showAddChild, setShowAddChild] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New child form
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');
  const [newChildVocab, setNewChildVocab] = useState('beginner');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadChildren();
    }
  }, [status]);

  useEffect(() => {
    if (selectedChild) {
      loadSessions(selectedChild);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    try {
      const response = await fetch('/api/children');
      if (response.ok) {
        const data = await response.json();
        setChildren(data.children);
        if (data.children.length > 0) {
          setSelectedChild(data.children[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load children:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessions = async (childId: string) => {
    try {
      const response = await fetch(`/api/sessions?childId=${childId}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChildName,
          age: parseInt(newChildAge),
          vocabularyLevel: newChildVocab,
          aiVoiceEnabled: false,
        }),
      });

      if (response.ok) {
        await loadChildren();
        setShowAddChild(false);
        setNewChildName('');
        setNewChildAge('');
        setNewChildVocab('beginner');
      }
    } catch (error) {
      console.error('Failed to add child:', error);
    }
  };

  const handleToggleAI = async (childId: string, currentStatus: boolean) => {
    try {
      await fetch('/api/children', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          aiVoiceEnabled: !currentStatus,
        }),
      });
      await loadChildren();
    } catch (error) {
      console.error('Failed to toggle AI:', error);
    }
  };

  const handleStartSession = async () => {
    if (!selectedChild) return;

    try {
      const child = children.find(c => c.id === selectedChild);
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChild,
          scenario: 'general-exploration',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Store session data in localStorage for the session page
        localStorage.setItem('currentSession', JSON.stringify({
          childId: selectedChild,
          childName: child?.name,
          aiVoiceEnabled: child?.aiVoiceEnabled,
        }));
        router.push(`/session/${data.session.id}`);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  const currentChild = children.find(c => c.id === selectedChild);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white shadow-md p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Parent Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {session?.user?.name}!
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-6 py-2 bg-gray-600 text-white rounded-full font-semibold hover:bg-gray-700 transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Children Management */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl shadow-xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Children</h2>
                <button
                  onClick={() => setShowAddChild(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-blue-600"
                >
                  + Add
                </button>
              </div>

              {children.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-6xl mb-4">👶</p>
                  <p>No children yet</p>
                  <p className="text-sm mt-2">Add your first child to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {children.map((child) => (
                    <div
                      key={child.id}
                      onClick={() => setSelectedChild(child.id)}
                      className={`p-4 rounded-2xl cursor-pointer transition ${
                        selectedChild === child.id
                          ? 'bg-purple-100 border-2 border-purple-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg">{child.name}</h3>
                          <p className="text-sm text-gray-600">
                            Age {child.age} • {child.vocabularyLevel}
                          </p>
                        </div>
                        <div className="text-2xl">
                          {child.aiVoiceEnabled ? '🎤' : '👁️'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Add Child Modal */}
            {showAddChild && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-3xl p-8 max-w-md w-full"
                >
                  <h2 className="text-2xl font-bold mb-6">Add Child</h2>
                  <form onSubmit={handleAddChild} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Name</label>
                      <input
                        type="text"
                        value={newChildName}
                        onChange={(e) => setNewChildName(e.target.value)}
                        required
                        className="w-full px-4 py-2 border-2 rounded-xl focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Age</label>
                      <input
                        type="number"
                        value={newChildAge}
                        onChange={(e) => setNewChildAge(e.target.value)}
                        required
                        min="3"
                        max="12"
                        className="w-full px-4 py-2 border-2 rounded-xl focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Vocabulary Level</label>
                      <select
                        value={newChildVocab}
                        onChange={(e) => setNewChildVocab(e.target.value)}
                        className="w-full px-4 py-2 border-2 rounded-xl focus:outline-none focus:border-purple-500"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowAddChild(false)}
                        className="flex-1 px-4 py-3 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600"
                      >
                        Add Child
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {currentChild ? (
              <>
                {/* AI Voice Toggle */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl shadow-xl p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        AI Voice Guidance
                      </h3>
                      <p className="text-gray-600">
                        {currentChild.aiVoiceEnabled
                          ? 'AI will provide gentle guidance during learning'
                          : 'AI will observe silently without speaking'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleAI(currentChild.id, currentChild.aiVoiceEnabled)}
                      className={`relative inline-flex h-12 w-24 items-center rounded-full transition ${
                        currentChild.aiVoiceEnabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-10 w-10 transform rounded-full bg-white transition ${
                          currentChild.aiVoiceEnabled ? 'translate-x-12' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </motion.div>

                {/* Start Session */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl shadow-xl p-8 text-white text-center"
                >
                  <div className="text-6xl mb-4">🚀</div>
                  <h3 className="text-3xl font-bold mb-4">
                    Ready to Learn?
                  </h3>
                  <p className="mb-6 text-lg">
                    Start a new learning session with {currentChild.name}
                  </p>
                  <button
                    onClick={handleStartSession}
                    className="bg-white text-purple-600 px-12 py-4 rounded-full font-bold text-xl hover:bg-gray-100 transition shadow-lg"
                  >
                    Start Session
                  </button>
                </motion.div>

                {/* Recent Sessions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-3xl shadow-xl p-6"
                >
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    Recent Sessions
                  </h3>
                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No sessions yet</p>
                      <p className="text-sm mt-2">Start your first learning session!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.slice(0, 5).map((session) => (
                        <div
                          key={session.id}
                          className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition cursor-pointer"
                          onClick={() => router.push(`/summary/${session.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">
                                {session.scenario}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(session.startedAt).toLocaleDateString()} •{' '}
                                {session.utterances.length} messages
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              session.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {session.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl shadow-xl p-12 text-center"
              >
                <div className="text-6xl mb-4">👈</div>
                <p className="text-xl text-gray-600">
                  Select or add a child to get started
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
