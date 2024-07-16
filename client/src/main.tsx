import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, redirect, RouterProvider } from 'react-router-dom';
import App from './App';
import Login from './Login';
import Error from './Error';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <Error />,
    loader: async () => {
      const authenticated = await (await fetch('check', { method: 'POST' })).json();
      if (!authenticated) {
        return redirect('login');
      }
      return null;
    }
  }, {
    path: 'login',
    element: <Login />,
    loader: async () => {
      const authenticated = await (await fetch('check', { method: 'POST' })).json();
      if (authenticated) {
        return redirect('/');
      }
      return null;
    }
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
