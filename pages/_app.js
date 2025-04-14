import '../styles/globals.css';
import { AuthProvider } from '../contexts/auth';

function MyApp({ Component, pageProps }) {
  console.log("_app renderizado");
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp; 