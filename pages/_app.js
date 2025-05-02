import '../styles/globals.css';
import '../styles/fonts.css';
import { AuthProvider } from '../contexts/auth';
import Head from 'next/head';

const AVAILABLE_FONTS = [
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Dosis', label: 'Dosis' }
];

function MyApp({ Component, pageProps }) {
  console.log("_app renderizado");
  return (
    <AuthProvider>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Raleway:wght@400;500;700&family=Poppins:wght@400;500;700&family=Nunito:wght@400;500;700&family=Merriweather:wght@400;500;700&family=Dosis:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp; 