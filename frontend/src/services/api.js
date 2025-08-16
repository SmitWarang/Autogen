import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "An error occurred";
    console.error("API Error:", message);
    return Promise.reject({
      ...error,
      message,
    });
  }
);

// Question APIs
export const uploadQuestions = (formData) => {
  return api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getQuestions = (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return api.get(`/questions?${params}`);
};

export const getQuestionById = (id) => {
  return api.get(`/questions/${id}`);
};

export const updateQuestion = (id, data) => {
  return api.put(`/questions/${id}`, data);
};

export const deleteQuestion = (id) => {
  return api.delete(`/questions/${id}`);
};

export const getQuestionStats = (subject) => {
  const params = subject ? `?subject=${subject}` : "";
  return api.get(`/questions/stats${params}`);
};

// Blueprint APIs
export const createBlueprint = (blueprintData) => {
  return api.post("/blueprints", blueprintData);
};

export const getBlueprints = () => {
  return api.get("/blueprints");
};

export const getBlueprintById = (id) => {
  return api.get(`/blueprints/${id}`);
};

export const updateBlueprint = (id, data) => {
  return api.put(`/blueprints/${id}`, data);
};

export const deleteBlueprint = (id) => {
  return api.delete(`/blueprints/${id}`);
};

export const validateBlueprint = (blueprintData) => {
  return api.post("/blueprints/validate", blueprintData);
};

// Paper Generation APIs
export const generatePapers = (blueprintId) => {
  return api.post("/papers/generate", { blueprintId });
};

export const getPapers = (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return api.get(`/papers?${params}`);
};

export const getPaperById = (id) => {
  return api.get(`/papers/${id}`);
};

export const deletePaper = (id) => {
  return api.delete(`/papers/${id}`);
};

export const exportPaperToPDF = (id) => {
  return api.get(`/papers/${id}/export`, {
    responseType: "blob",
  });
};

export const getRecentPapers = (limit = 5) => {
  return api.get(`/papers/`);
};

// Utility APIs
export const getSubjects = () => {
  return api.get("/questions/subjects");
};

export const getCourseOutcomes = (subject) => {
  const params = subject ? `?subject=${subject}` : "";
  return api.get(`/questions/cos${params}`);
};

export const getRBTLevels = () => {
  return api.get("/questions/rbt-levels");
};

// Dashboard APIs
export const getDashboardStats = () => {
  return api.get("/dashboard/stats");
};

export default api;
