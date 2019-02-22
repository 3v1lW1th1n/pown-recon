const querystring = require('querystring')
const { Scheduler } = require('@pown/request/lib/scheduler')

const { Transformer } = require('../../transformer')

const scheduler = new Scheduler()

const cloudflareDnsQuery = class extends Transformer {
    static get alias() {
        return ['cloudflare_dns_query', 'cfdq']
    }

    static get title() {
        return 'CloudFlare DNS Query'
    }

    static get description() {
        return 'Query CloudFlare DNS API.'
    }

    static get tags() {
        return []
    }

    static get types() {
        return ['domain', 'ipv4', 'ipv6']
    }

    static get options() {
        return {
            type: {
                description: 'Record type',
                type: 'string',
                default: 'A'
            }
        }
    }

    static get noise() {
        return 1
    }

    constructor() {
        super()

        this.headers = {
            'user-agent': 'Pown',
            'accept': 'application/dns-json'
        }
    }

    async handle({ id: target = '', label = '' }, options) {
        const { type = 'A' } = options

        const query = querystring.stringify({
            name: label,
            type: type
        })

        const { responseBody } = await scheduler.fetch(`https://cloudflare-dns.com/dns-query?${query}`, this.headers)

        const { Answer = [] } = JSON.parse(responseBody.toString())

        return Answer.map(({ type, data }) => {
            if (type === 1) {
                const ipv4 = data

                return { type: 'ipv4', label: ipv4, props: { ipv4 }, edges: [target] }
            }
            else
            if (type === 2) {
                const domain = data.slice(0, -1).toLowerCase()

                return { type: 'domain', label: domain, props: { domain }, edges: [target] }
            }
            else
            if (type === 5) {
                const domain = data.slice(0, -1).toLowerCase()

                return { type: 'domain', label: domain, props: { domain }, edges: [target] }
            }
            else
            if (type === 15) {
                const domain = data.split(' ')[1].slice(0, -1).toLowerCase()

                return { type: 'domain', label: domain, props: { domain }, edges: [target] }
            }
            else
            if (type === 16) {
                const string = data.slice(1, -1)

                return { type: 'string', label: string, props: { string }, edges: [target] }
            }
            else
            if (type === 28) {
                const ipv6 = data

                return { type: 'ipv6', label: ipv6, props: { ipv6 }, edges: [target] }
            }
            else {
                const string = data

                return { type: 'string', label: string, props: { string }, edges: [target] }
            }
        })
    }
}

module.exports = { cloudflareDnsQuery }
