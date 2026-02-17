// Mock Supabase Client for Development/Testing
// This allows the app to work without a real Supabase backend

class MockSupabaseClient {
    constructor() {
        // In-memory storage
        this.storage = {
            candidates: [],
            criteria: [
                {
                    id: '1',
                    name: 'Fresher (0-2 years, No Testing)',
                    description: 'For candidates with 0-2 years of experience without testing background',
                    passing_percentage: 70,
                    is_active: true,
                    created_at: new Date().toISOString()
                },
                {
                    id: '2',
                    name: 'Experienced (Testing Background)',
                    description: 'For candidates with testing experience',
                    passing_percentage: 80,
                    is_active: true,
                    created_at: new Date().toISOString()
                }
            ],
            questions: [
                {
                    id: '1',
                    criteria_id: '1',
                    category: 'Testing Basics',
                    set_name: 'Set A - General Testing',
                    set_type: 'mandatory',
                    questions_to_select: null,
                    total_in_set: null,
                    set_order: 1,
                    question_text: 'What is the purpose of software testing?',
                    options: ['To find bugs', 'To write code', 'To design UI', 'To deploy applications'],
                    correct_answer: 'To find bugs',
                    difficulty: 'easy',
                    is_active: true
                },
                {
                    id: '2',
                    criteria_id: '1',
                    category: 'Automation',
                    set_name: 'Set A - General Testing',
                    set_type: 'mandatory',
                    questions_to_select: null,
                    total_in_set: null,
                    set_order: 2,
                    question_text: 'Which of the following is a testing framework?',
                    options: ['React', 'Selenium', 'Node.js', 'MySQL'],
                    correct_answer: 'Selenium',
                    difficulty: 'medium',
                    is_active: true
                },
                {
                    id: '3',
                    criteria_id: '1',
                    category: 'API Testing',
                    set_name: 'Set A - General Testing',
                    set_type: 'mandatory',
                    questions_to_select: null,
                    total_in_set: null,
                    set_order: 3,
                    question_text: 'What does API stand for?',
                    options: ['Application Programming Interface', 'Advanced Program Integration', 'Automated Process Interaction', 'Application Process Interface'],
                    correct_answer: 'Application Programming Interface',
                    difficulty: 'easy',
                    is_active: true
                },
                {
                    id: '4',
                    criteria_id: '2',
                    category: 'Testing Concepts',
                    set_name: 'Set B - Advanced Testing',
                    set_type: 'mandatory',
                    questions_to_select: null,
                    total_in_set: null,
                    set_order: 1,
                    question_text: 'What is regression testing?',
                    options: ['Testing new features', 'Re-testing after bug fixes', 'Performance testing', 'Security testing'],
                    correct_answer: 'Re-testing after bug fixes',
                    difficulty: 'medium',
                    is_active: true
                },
                {
                    id: '5',
                    criteria_id: '2',
                    category: 'API Testing',
                    set_name: 'Set B - Advanced Testing',
                    set_type: 'mandatory',
                    questions_to_select: null,
                    total_in_set: null,
                    set_order: 2,
                    question_text: 'Which tool is used for API testing?',
                    options: ['Photoshop', 'Postman', 'Excel', 'PowerPoint'],
                    correct_answer: 'Postman',
                    difficulty: 'easy',
                    is_active: true
                }
            ],
            interviews: [],
            answers: [],
            users: [
                {
                    id: 'admin-1',
                    email: 'admin@sdet.com',
                    password: 'admin123' // In real app, this would be hashed
                }
            ]
        };

        this.currentUser = null;
    }

    // Auth methods
    auth = {
        signInWithPassword: async ({ email, password }) => {
            await this._delay(500);
            const user = this.storage.users.find(u => u.email === email && u.password === password);

            if (user) {
                this.currentUser = { id: user.id, email: user.email };
                return { data: { user: this.currentUser }, error: null };
            }

            return { data: null, error: { message: 'Invalid credentials' } };
        },

        signOut: async () => {
            await this._delay(300);
            this.currentUser = null;
            return { error: null };
        },

        getSession: async () => {
            return {
                data: {
                    session: this.currentUser ? { user: this.currentUser } : null
                },
                error: null
            };
        },

        getUser: async () => {
            return {
                data: { user: this.currentUser },
                error: null
            };
        },

        onAuthStateChange: (callback) => {
            // Simple mock - just call immediately with current state
            callback('SIGNED_IN', this.currentUser ? { user: this.currentUser } : null);
            return {
                data: {
                    subscription: { unsubscribe: () => { } }
                }
            };
        }
    };

    // Database methods
    from(table) {
        return new MockQueryBuilder(this.storage, table, this);
    }

    // Helper method to simulate network delay
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Generate UUID
    _generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

class MockQueryBuilder {
    constructor(storage, table, client) {
        this.storage = storage;
        this.table = table;
        this.client = client;
        this.filters = [];
        this.selectFields = '*';
        this.orderField = null;
        this.orderAscending = true;
        this.limitCount = null;
    }

    select(fields = '*') {
        this.selectFields = fields;
        return this;
    }

    insert(data) {
        this.insertData = Array.isArray(data) ? data : [data];
        return this;
    }

    update(data) {
        this.updateData = data;
        return this;
    }

    eq(field, value) {
        this.filters.push({ field, op: 'eq', value });
        return this;
    }

    order(field, options = {}) {
        this.orderField = field;
        this.orderAscending = options.ascending !== false;
        return this;
    }

    limit(count) {
        this.limitCount = count;
        return this;
    }

    single() {
        this.returnSingle = true;
        return this;
    }

    async then(resolve) {
        await this.client._delay(300);

        try {
            let result;

            if (this.insertData) {
                // INSERT
                result = this.insertData.map(item => ({
                    ...item,
                    id: item.id || this.client._generateId(),
                    created_at: item.created_at || new Date().toISOString()
                }));

                this.storage[this.table].push(...result);

                if (this.returnSingle) {
                    resolve({ data: result[0], error: null });
                } else {
                    resolve({ data: result, error: null });
                }
            } else if (this.updateData) {
                // UPDATE
                let items = this.storage[this.table];

                // Apply filters
                items = this._applyFilters(items);

                // Update items
                items.forEach(item => {
                    Object.assign(item, this.updateData, { updated_at: new Date().toISOString() });
                });

                resolve({ data: items, error: null });
            } else {
                // SELECT
                let items = [...this.storage[this.table]];

                // Apply filters
                items = this._applyFilters(items);

                // Apply ordering
                if (this.orderField) {
                    items.sort((a, b) => {
                        const aVal = a[this.orderField];
                        const bVal = b[this.orderField];
                        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                        return this.orderAscending ? comparison : -comparison;
                    });
                }

                // Apply limit
                if (this.limitCount) {
                    items = items.slice(0, this.limitCount);
                }

                if (this.returnSingle) {
                    resolve({ data: items[0] || null, error: null });
                } else {
                    resolve({ data: items, error: null });
                }
            }
        } catch (error) {
            resolve({ data: null, error: { message: error.message } });
        }
    }

    _applyFilters(items) {
        return items.filter(item => {
            return this.filters.every(filter => {
                if (filter.op === 'eq') {
                    return item[filter.field] === filter.value;
                }
                return true;
            });
        });
    }
}

// Export the client based on environment variables
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client;

if (supabaseUrl && supabaseAnonKey) {
    console.log('🚀 Using Real Supabase Client');
    client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage: sessionStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });
} else {
    console.log('⚠ Using Mock Supabase Client (No environment variables found)');
    client = new MockSupabaseClient();
}

export const supabase = client;
