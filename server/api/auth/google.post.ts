import { OAuth2Client } from 'google-auth-library'
import users, { type User } from '~/server/model/users'
import jwt from 'jsonwebtoken'

interface Decoded {
    email: string,
    email_verified: boolean,
    name: string,
}

export default defineEventHandler(async (event) => {
    const body = await readBody<{ credential: string }>(event)
    const runTimeConfig = useRuntimeConfig()
    const client = new OAuth2Client(runTimeConfig.google.clientId);

    try {
        const decoded = await client.verifyIdToken({
            idToken: body.credential,
            audience: runTimeConfig.google.clientId
        })
        const { email, email_verified, name } = decoded.getPayload() as Decoded
        if (!email_verified) {
            return {
                statusCode: 401,
                body: { message: 'Email not verified' }
            }
        }
        const emailIsUser: User | null = await users.findOne({ email: email })
        if (emailIsUser) {
            const token = jwt.sign({ email, name: emailIsUser.name }, runTimeConfig.secretJwtKey, { algorithm: 'HS384' })
            emailIsUser.token.push(token)
            await emailIsUser.save()
            setCookie(event, 'jwt', token, { httpOnly: true, secure: true, sameSite: 'strict' })
            return {
                statusCode: 201,
                body: { message: 'User already exists', token }
            }
        } else if (!emailIsUser) {
            return {
                statusCode: 404,
                body: { message: 'User does not exist' }
            }
        } else {
            return {
                statusCode: 500,
                body: { message: 'Server error' }
            }
        }
    } catch (error) {

    }

})