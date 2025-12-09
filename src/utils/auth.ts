
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type User = {
    id: number;
    username: string;
    email: string;
    isAdmin: boolean;
    isSupervisor: boolean;
};

let currentUser: User | null = null;

/**
 * Gets the currently logged-in user.
 * @returns The user object or null if not logged in.
 */
export const getCurrentUser = (): User | null => {
    return currentUser;
};

/**
 * Sets the current user in the global state.
 * @param user - The user object to set.
 */
export const setCurrentUser = (user: User): void => {
    currentUser = user;
};

/**
 * Clears the current user from the global state (logout).
 */
export const clearCurrentUser = (): void => {
    currentUser = null;
};
