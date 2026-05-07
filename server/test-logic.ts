import { getRoleRank } from './src/middleware/auth.middleware';

async function testLogic() {
    const actorRole: string = 'HR_MANAGER';
    const actorRank = getRoleRank(actorRole);
    console.log('HR_MANAGER Rank:', actorRank);

    const privilegedRoles = ['MD', 'DIRECTOR', 'HR_OFFICER', 'IT_MANAGER', 'IT_ADMIN'];
    console.log('Is Privileged:', privilegedRoles.includes(actorRole));

    if (!privilegedRoles.includes(actorRole) && actorRank < 70) {
        console.log('BLOCKED at privileged check');
    } else {
        console.log('PASSED privileged check');
    }

    const currentTargetRank = 40; // Staff
    if (actorRank < 80 && actorRole !== 'DEV') {
        console.log('Inside rank < 80 block');
    } else {
        console.log('Bypassed rank < 80 block');
    }

    if (actorRank < 85 && actorRole !== 'DEV') {
         console.log('Inside rank < 85 block');
    } else {
         console.log('Bypassed rank < 85 block');
    }
}

testLogic();
