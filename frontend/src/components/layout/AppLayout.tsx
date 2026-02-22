import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { TransactionModal } from '../transactions/TransactionModal';
import transactionService, { TransactionCreate } from '../../services/transaction.service';
import debtService, { DebtCreate } from '../../services/debt.service';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [showModal, setShowModal] = useState(false);

  const handleCreateTransaction = async (data: TransactionCreate) => {
    await transactionService.createTransaction(data);
    setShowModal(false);
  };

  const handleCreateDebt = async (data: DebtCreate) => {
    await debtService.createDebt(data);
    setShowModal(false);
  };

  return (
    <div className="flex min-h-screen relative z-10">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto min-w-0 pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <MobileNav onAddTransaction={() => setShowModal(true)} />

      {/* Transaction modal triggered from bottom nav */}
      {showModal && (
        <TransactionModal
          onSubmit={handleCreateTransaction}
          onDebtSubmit={handleCreateDebt}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};
