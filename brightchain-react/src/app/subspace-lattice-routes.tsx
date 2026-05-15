import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { GameLayout } from 'subspace-lattice-react';

export const SubspaceLatticeRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/subspace-lattice" element={<GameLayout />} />
      <Route path="/subspace-lattice/:roomCode" element={<GameLayout />} />
    </Routes>
  );
};

export default SubspaceLatticeRoutes;
