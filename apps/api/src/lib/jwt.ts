import jwt from 'jsonwebtoken'
const ACCESS_SECRET=process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET=process.env.JWT_REFRESH_SECRET!

export function generateAccessToken(userId: string): string{
    return jwt.sign({userId},ACCESS_SECRET,{expiresIn:'15m'});
}

export function generateRefreshToken(userId:string): string{
    return jwt.sign({userId},REFRESH_SECRET,{ expiresIn:'7d'});
}
export function verifyAccessToken(token:string):{userId:string}{
    return jwt.verify(token,ACCESS_SECRET) as {userId : string}
}
export function verifyRefreshToken(token:string): {userId:string}{
    return jwt.verify(token,REFRESH_SECRET) as {userId : string}
}
