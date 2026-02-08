import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Tag, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function CategorySelection() {
    const navigate = useNavigate();
    const location = useLocation();
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const candidateData = location.state?.candidateData;
    const criteriaId = location.state?.criteriaId;

    useEffect(() => {
        if (!candidateData || !criteriaId) {
            navigate('/');
            return;
        }
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            // Get all questions for this criteria
            const { data, error } = await supabase
                .from('questions')
                .select('category')
                .eq('criteria_id', criteriaId)
                .eq('is_active', true);

            if (error) throw error;

            // Extract unique categories
            const uniqueCategories = [...new Set(data.map(q => q.category).filter(Boolean))];

            // Count questions per category
            const categoryCounts = {};
            data.forEach(q => {
                if (q.category) {
                    categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
                }
            });

            const categoryData = uniqueCategories.map(cat => ({
                name: cat,
                count: categoryCounts[cat] || 0
            }));

            setCategories(categoryData);
        } catch (err) {
            console.error('Failed to load categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (categoryName) => {
        if (selectedCategories.includes(categoryName)) {
            setSelectedCategories(selectedCategories.filter(c => c !== categoryName));
        } else {
            setSelectedCategories([...selectedCategories, categoryName]);
        }
    };

    const handleContinue = () => {
        if (selectedCategories.length === 0) {
            alert('Please select at least one category');
            return;
        }

        // Store selected categories in session
        sessionStorage.setItem('selectedCategories', JSON.stringify(selectedCategories));

        navigate('/quiz', {
            state: {
                candidateData,
                criteriaId,
                selectedCategories
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedCategories.length === categories.length) {
            setSelectedCategories([]);
        } else {
            setSelectedCategories(categories.map(c => c.name));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
            <div className="max-w-4xl mx-auto py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-4">
                        <Tag size={48} className="text-cyan-400" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Choose Your Topics
                    </h1>
                    <p className="text-slate-300 text-lg">
                        Select the categories you want to be tested on
                    </p>
                    <p className="text-slate-400 text-sm mt-2">
                        You can select one or multiple categories
                    </p>
                </div>

                {/* Select All Button */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleSelectAll}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm"
                    >
                        {selectedCategories.length === categories.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>

                {/* Categories Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {categories.map((category) => {
                        const isSelected = selectedCategories.includes(category.name);
                        return (
                            <button
                                key={category.name}
                                onClick={() => toggleCategory(category.name)}
                                className={`relative p-6 rounded-2xl border-2 transition-all transform hover:scale-105 ${isSelected
                                        ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/50'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                {isSelected && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 size={24} className="text-cyan-400" />
                                    </div>
                                )}

                                <div className="text-center">
                                    <h3 className="text-xl font-semibold text-white mb-2">
                                        {category.name}
                                    </h3>
                                    <p className="text-slate-400 text-sm">
                                        {category.count} question{category.count !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Selected Summary */}
                {selectedCategories.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
                        <h3 className="text-white font-semibold mb-3">Selected Categories:</h3>
                        <div className="flex flex-wrap gap-2">
                            {selectedCategories.map(cat => (
                                <span
                                    key={cat}
                                    className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm border border-cyan-500/30"
                                >
                                    {cat}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Continue Button */}
                <div className="flex justify-center">
                    <button
                        onClick={handleContinue}
                        disabled={selectedCategories.length === 0}
                        className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        Continue to Quiz
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
