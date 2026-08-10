import { http, HttpResponse } from 'msw';


export const API = 'http://localhost:5000/api';


export const handlers = [
  http.get(`${API}/auth/me`, () => HttpResponse.json({ success: true, user: null })),
  http.get(`${API}/plots/my`, () => HttpResponse.json({ success: true, plot: null })),
];
