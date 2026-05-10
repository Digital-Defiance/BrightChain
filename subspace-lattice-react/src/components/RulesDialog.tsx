import React from 'react';
import './RulesDialog.css';

interface RulesDialogProps {
  onClose: () => void;
}

export const RulesDialog: React.FC<RulesDialogProps> = ({ onClose }) => {
  return (
    <div className="rules-overlay" onClick={onClose}>
      <div className="rules-dialog" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2>Subspace Lattice Rules</h2>
        
        <div className="rules-content">
            <h3>Overview</h3>
            <p>Subspace Lattice is a modern hybrid board game combining spatial territory control with individual piece agency. You command a fleet on an 11x11 sector grid.</p>
            
            <h3>Victory Conditions</h3>
            <ul>
                <li><strong>Surgical Strike:</strong> Capture the enemy Command Hub (♚/♔).</li>
            </ul>

            <h3>The Board</h3>
            <p>The board features empty space and a central <strong>Gravity Well</strong> which cannot be occupied or traversed.</p>

            <h3>The Pieces & Movement</h3>
            <ul>
                <li><strong>Command Hub (♚/♔):</strong> The "King". Moves 1 space in any direction. Capturing this ends the game.</li>
                <li><strong>Escorts (♟/♙):</strong> The "Pawns/Sentries". Move exactly 1 space orthogonally (up, down, left, right).</li>
                <li><strong>Infiltrators (♞/♘):</strong> The "Knights". Move in an L-shape (2 spaces one direction, 1 space perpendicular) and can jump over other pieces.</li>
                <li><strong>Beams (♜/♖):</strong> The "Rooks". Move any distance in a straight line orthogonally, but cannot jump over pieces or gravity wells.</li>
            </ul>

            <h3>Upcoming Features (Sensor Net)</h3>
            <p>The "Sensor Net" (territory control) logic is currently under development. In the future, occupying Sovereign Space will provide movement bonuses and limit enemy mobility.</p>
        </div>
      </div>
    </div>
  );
};
