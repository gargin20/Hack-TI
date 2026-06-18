// import { useEffect } from 'react';
// import { useDispatch } from 'react-redux';
// import App from '../App.jsx';
// import { restoreSession } from '../features/auth/authThunks.js';
// import { fetchCareerIntegrations } from '../features/careerIntegrations/careerIntegrationSlice.js';
// import { fetchHealthIntegration } from '../features/healthIntegration/healthIntegrationSlice.js';

// function AuthBootstrap() {
//   const dispatch = useDispatch();

//   useEffect(() => {
//     dispatch(restoreSession())
//       .unwrap()
//       .then(() => {
//         dispatch(fetchCareerIntegrations());
//         dispatch(fetchHealthIntegration());
//       })
//       .catch(() => {});
//   }, [dispatch]);

//   return <App />;
// }

// export default AuthBootstrap;

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import App from '../App.jsx';
import { restoreSession } from '../features/auth/authThunks.js';
import { fetchCareerIntegrations } from '../features/careerIntegrations/careerIntegrationSlice.js';
import { fetchHealthIntegration } from '../features/healthIntegration/healthIntegrationSlice.js';

function AuthBootstrap() {
  const dispatch = useDispatch();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await dispatch(restoreSession()).unwrap();

        dispatch(fetchCareerIntegrations());
        dispatch(fetchHealthIntegration());
      } catch (e) {
        console.log('restoreSession failed', e);
      } finally {
        setReady(true);
      }
    }

    init();
  }, [dispatch]);

  if (!ready) {
  return (
    <div
      style={{
        height: '100vh',
        display: 'grid',
        placeItems: 'center',
        fontSize: '24px',
      }}
    >
      Loading AuthBootstrap...
    </div>
  );
}

  return <App />;
}

export default AuthBootstrap;