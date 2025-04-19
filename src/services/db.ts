
// Serviço de banco de dados local com IndexedDB

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'employee';
  avatar?: string;
  createdAt: Date;
}

export interface TimeRecord {
  id: string;
  userId: string;
  type: 'check-in' | 'check-out' | 'break-start' | 'break-end';
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  note?: string;
}

export interface WorkSchedule {
  id: string;
  userId: string;
  weekDay: number; // 0-6 (domingo a sábado)
  startTime: string; // 'HH:MM' formato
  endTime: string; // 'HH:MM' formato
  breakStart?: string;
  breakEnd?: string;
}

const DB_NAME = 'pontoLocalDB';
const DB_VERSION = 1;

// Inicializar banco de dados
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Erro ao abrir banco de dados', event);
      reject('Erro ao abrir banco de dados');
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log('Banco de dados aberto com sucesso');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Criar stores (tabelas)
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('email', 'email', { unique: true });
        userStore.createIndex('role', 'role', { unique: false });
        
        // Criar usuário administrador padrão
        const adminUser: User = {
          id: 'admin-' + Date.now().toString(),
          name: 'Administrador',
          email: 'admin@pontolocal.com',
          password: 'admin123', // Em produção, isso deveria ser hash
          role: 'admin',
          createdAt: new Date()
        };
        
        userStore.add(adminUser);
      }

      if (!db.objectStoreNames.contains('timeRecords')) {
        const recordStore = db.createObjectStore('timeRecords', { keyPath: 'id' });
        recordStore.createIndex('userId', 'userId', { unique: false });
        recordStore.createIndex('timestamp', 'timestamp', { unique: false });
        recordStore.createIndex('userAndTimestamp', ['userId', 'timestamp'], { unique: false });
      }

      if (!db.objectStoreNames.contains('workSchedules')) {
        const scheduleStore = db.createObjectStore('workSchedules', { keyPath: 'id' });
        scheduleStore.createIndex('userId', 'userId', { unique: false });
        scheduleStore.createIndex('userAndWeekDay', ['userId', 'weekDay'], { unique: true });
      }
    };
  });
};

// Funções genéricas para operações CRUD
const getStore = (storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> => {
  return new Promise((resolve, reject) => {
    initDB()
      .then(db => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        resolve(store);
      })
      .catch(error => reject(error));
  });
};

// Funções CRUD para Users
export const createUser = (user: User): Promise<User> => {
  return new Promise((resolve, reject) => {
    getStore('users', 'readwrite')
      .then(store => {
        const request = store.add(user);
        request.onsuccess = () => resolve(user);
        request.onerror = () => reject('Erro ao criar usuário');
      })
      .catch(error => reject(error));
  });
};

export const getUserById = (id: string): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    getStore('users')
      .then(store => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject('Erro ao buscar usuário');
      })
      .catch(error => reject(error));
  });
};

export const getUserByEmail = (email: string): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    getStore('users')
      .then(store => {
        const index = store.index('email');
        const request = index.get(email);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject('Erro ao buscar usuário por email');
      })
      .catch(error => reject(error));
  });
};

export const getAllUsers = (): Promise<User[]> => {
  return new Promise((resolve, reject) => {
    getStore('users')
      .then(store => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Erro ao listar usuários');
      })
      .catch(error => reject(error));
  });
};

export const updateUser = (user: User): Promise<User> => {
  return new Promise((resolve, reject) => {
    getStore('users', 'readwrite')
      .then(store => {
        const request = store.put(user);
        request.onsuccess = () => resolve(user);
        request.onerror = () => reject('Erro ao atualizar usuário');
      })
      .catch(error => reject(error));
  });
};

export const deleteUser = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    getStore('users', 'readwrite')
      .then(store => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Erro ao excluir usuário');
      })
      .catch(error => reject(error));
  });
};

// Funções CRUD para TimeRecords
export const createTimeRecord = (record: TimeRecord): Promise<TimeRecord> => {
  return new Promise((resolve, reject) => {
    getStore('timeRecords', 'readwrite')
      .then(store => {
        const request = store.add(record);
        request.onsuccess = () => resolve(record);
        request.onerror = () => reject('Erro ao registrar ponto');
      })
      .catch(error => reject(error));
  });
};

export const getTimeRecordsByUserId = (userId: string): Promise<TimeRecord[]> => {
  return new Promise((resolve, reject) => {
    getStore('timeRecords')
      .then(store => {
        const index = store.index('userId');
        const request = index.getAll(userId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Erro ao buscar registros de ponto');
      })
      .catch(error => reject(error));
  });
};

export const getTimeRecordsByDate = (userId: string, startDate: Date, endDate: Date): Promise<TimeRecord[]> => {
  return new Promise((resolve, reject) => {
    getTimeRecordsByUserId(userId)
      .then(records => {
        const filteredRecords = records.filter(record => {
          const recordDate = new Date(record.timestamp);
          return recordDate >= startDate && recordDate <= endDate;
        });
        resolve(filteredRecords);
      })
      .catch(error => reject(error));
  });
};

// Funções CRUD para WorkSchedules
export const createWorkSchedule = (schedule: WorkSchedule): Promise<WorkSchedule> => {
  return new Promise((resolve, reject) => {
    getStore('workSchedules', 'readwrite')
      .then(store => {
        const request = store.add(schedule);
        request.onsuccess = () => resolve(schedule);
        request.onerror = () => reject('Erro ao criar escala de trabalho');
      })
      .catch(error => reject(error));
  });
};

export const getWorkSchedulesByUserId = (userId: string): Promise<WorkSchedule[]> => {
  return new Promise((resolve, reject) => {
    getStore('workSchedules')
      .then(store => {
        const index = store.index('userId');
        const request = index.getAll(userId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Erro ao buscar escalas de trabalho');
      })
      .catch(error => reject(error));
  });
};

export const updateWorkSchedule = (schedule: WorkSchedule): Promise<WorkSchedule> => {
  return new Promise((resolve, reject) => {
    getStore('workSchedules', 'readwrite')
      .then(store => {
        const request = store.put(schedule);
        request.onsuccess = () => resolve(schedule);
        request.onerror = () => reject('Erro ao atualizar escala de trabalho');
      })
      .catch(error => reject(error));
  });
};

export const deleteWorkSchedule = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    getStore('workSchedules', 'readwrite')
      .then(store => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Erro ao excluir escala de trabalho');
      })
      .catch(error => reject(error));
  });
};
