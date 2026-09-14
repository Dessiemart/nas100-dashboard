export default function App({ Component, pageProps }) {
  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        html,
        body {
          margin: 0;
          padding: 0;
          background: #0a0a0a;
          color: #e5e5e5;
        }
        a {
          color: inherit;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
