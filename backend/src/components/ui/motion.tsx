'use client';

import { motion } from 'framer-motion';

export const fadeIn = {
    initial: { opacity: 0, y: 5 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -5 },
    transition: { duration: 0.2, ease: "easeOut" }
};

export const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

export const staggerItem = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const scaleOnPress = {
    whileTap: { scale: 0.96 },
    transition: { type: "spring", stiffness: 400, damping: 10 }
};

export const slideUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { type: "spring", stiffness: 300, damping: 30 }
};

// Reusable list wrapper
export const MotionList = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <motion.ul
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className={className}
    >
        {children}
    </motion.ul>
);

// Reusable list item wrapper
export const MotionItem = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <motion.li variants={staggerItem} className={className}>
        {children}
    </motion.li>
);
