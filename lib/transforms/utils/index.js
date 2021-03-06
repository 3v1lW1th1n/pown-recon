const { Transform } = require('../../transform')
const { ALL_TYPE, NICK_TYPE, DOMAIN_TYPE, EMAIL_TYPE, URI_TYPE, IPV4_TYPE, IPV6_TYPE, STRING_TYPE, BRAND_TYPE } = require('../../types')

const noop = class extends Transform {
    static get alias() {
        return ['nop']
    }

    static get title() {
        return 'No Op'
    }

    static get description() {
        return 'Does not do anything.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return []
    }

    static get options() {
        return {}
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1
    }

    async run() {
        return []
    }
}

const duplicate = class extends Transform {
    static get alias() {
        return ['dup']
    }

    static get title() {
        return 'Duplicate'
    }

    static get description() {
        return 'Duplicate input.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return [ALL_TYPE]
    }

    static get options() {
        return {
            newType: {
                type: 'string',
                description: 'Type of the new node.',
                default: STRING_TYPE
            }
        }
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1000
    }

    async handle(node, options) {
        const { newType = STRING_TYPE } = options

        const results = []

        results.push({ ...node, type: newType, id: this.makeId(), edges: [{ source: node.id, type: 'duplicate' }] })

        return results
    }
}

const extract = class extends Transform {
    static get alias() {
        return ['ext']
    }

    static get title() {
        return 'Extract'
    }

    static get description() {
        return 'Extract property.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return [ALL_TYPE]
    }

    static get options() {
        return {
            property: {
                type: 'string',
                description: 'The property to extract.',
                default: ''
            },

            prefix: {
                type: 'string',
                description: 'Prefix for the label.',
                default: ''
            },

            suffix: {
                type: 'string',
                description: 'Suffix for the label.',
                default: ''
            },

            newType: {
                type: 'string',
                description: 'Type of the new node.',
                default: STRING_TYPE
            }
        }
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1000
    }

    async handle({ id: source = '', label = '', props = {} }, options) {
        const { property = '', prefix = '', suffix = '', newType = STRING_TYPE } = options

        const results = []

        let value

        try {
            value = property.split('.').reduce((o, i) => o[i], props)
        }
        catch (e) {
            value = ''
        }

        if (value) {
            const newLabel = `${prefix}${value}${suffix}`

            results.push({
                type: newType,
                id: this.makeId(newType, newLabel),
                label: newLabel,
                props: {
                    [newType]: newLabel
                },
                edges: [{ source, type: 'extract' }]
            })
        }

        return results
    }
}

const prefix = class extends Transform {
    static get alias() {
        return ['prepand']
    }

    static get title() {
        return 'Prefix'
    }

    static get description() {
        return 'Adds a prefix.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return [ALL_TYPE]
    }

    static get options() {
        return {
            prefix: {
                type: 'string',
                description: 'The prefix to add.',
                default: ''
            },

            newType: {
                type: 'string',
                description: 'Type of the new node.',
                default: STRING_TYPE
            }
        }
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1000
    }

    async handle({ id: source = '', label = '' }, options) {
        const { prefix, newType = STRING_TYPE } = options

        const results = []

        if (prefix) {
            const newLabel = `${prefix}${label}`

            results.push({
                type: newType,
                id: this.makeId(newType, newLabel),
                label: newLabel,
                label,
                props: {
                    [newType]: newLabel
                },
                edges: [{ source, type: 'prefix' }]
            })
        }

        return results
    }
}

const suffix = class extends Transform {
    static get alias() {
        return ['append']
    }

    static get title() {
        return 'Suffix'
    }

    static get description() {
        return 'Adds a suffix.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return [ALL_TYPE]
    }

    static get options() {
        return {
            suffix: {
                type: 'string',
                description: 'The suffix to add.',
                default: ''
            },

            newType: {
                type: 'string',
                description: 'Type of the new node.',
                default: STRING_TYPE
            }
        }
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1000
    }

    async handle({ id: source = '', label = '' }, options) {
        const { suffix, newType = STRING_TYPE } = options

        const results = []

        if (suffix) {
            const newLabel = `${label}${suffix}`

            results.push({
                type: newType,
                id: this.makeId(newType, newLabel),
                label: newLabel,
                label,
                props: {
                    [newType]: label
                },
                edges: [{ source, type: 'suffix' }]
            })
        }

        return results
    }
}

const augment = class extends Transform {
    static get alias() {
        return []
    }

    static get title() {
        return 'Augment'
    }

    static get description() {
        return 'Augment with prefix or suffix.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return [ALL_TYPE]
    }

    static get options() {
        return {
            prefix: {
                type: 'string',
                description: 'The prefix to add.',
                default: ''
            },

            suffix: {
                type: 'string',
                description: 'The suffix to add.',
                default: ''
            },

            newType: {
                type: 'string',
                description: 'Type of the new node.',
                default: STRING_TYPE
            }
        }
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1000
    }

    async handle({ id: source = '', label = '' }, options) {
        const { prefix = '', suffix = '', newType = STRING_TYPE } = options

        const results = []

        if (prefix || suffix) {
            const newLabel = `${prefix}${label}${suffix}`

            results.push({
                type: newType,
                id: this.makeId(newType, newLabel),
                label: newLabel,
                label,
                props: {
                    [newType]: newLabel
                },
                edges: [{ source, type: 'augment' }]
            })
        }

        return results
    }
}

const splitEmail = class extends Transform {
    static get alias() {
        return ['split_email', 'se']
    }

    static get title() {
        return 'Split Email'
    }

    static get description() {
        return 'Split email.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return [EMAIL_TYPE]
    }

    static get options() {
        return {}
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1000
    }

    async handle({ id: source = '', label = '' }) {
        const [nick, domain] = label.split(/@/)

        const results = []

        if (nick) {
            results.push(this.makeNode({ type: NICK_TYPE, label: nick, props: { nick }, edges: [source] }))
        }

        if (domain) {
            results.push(this.makeNode({ type: DOMAIN_TYPE, label: domain, props: { domain }, edges: [source] }))
        }

        return results
    }
}

const buildEmail = class extends Transform {
    static get alias() {
        return ['build_email', 'be']
    }

    static get title() {
        return 'Build Email'
    }

    static get description() {
        return 'Build email.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return [DOMAIN_TYPE]
    }

    static get options() {
        return {
            protocol: {
                type: 'string',
                description: 'The email nick.',
                default: 'root'
            }
        }
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1000
    }

    async handle({ id: source = '', label = '' }, { nick = 'admin' }) {
        const email = `${nick}@${label}`

        const results = []

        results.push(this.makeNode({ type: EMAIL_TYPE, label: email, props: { email }, edges: [source] }))

        return results
    }
}

const splitDomain = class extends Transform {
    static get alias() {
        return ['split_domain', 'ss']
    }

    static get title() {
        return 'Split Domain'
    }

    static get description() {
        return 'Split domain.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return [DOMAIN_TYPE]
    }

    static get options() {
        return {}
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1000
    }

    async handle({ id: source = '', label = '' }) {
        const [brand, domain] = label.split(/\./)

        const results = []

        if (brand) {
            results.push(this.makeNode({ type: BRAND_TYPE, label: brand, props: { brand }, edges: [source] }))
        }

        if (domain) {
            if (domain.index('.') > 0) {
                results.push(this.makeNode({ type: DOMAIN_TYPE, label: domain, props: { domain }, edges: [source] }))
            }
        }

        return results
    }
}

const buildDomain = class extends Transform {
    static get alias() {
        return ['build_domain', 'bd']
    }

    static get title() {
        return 'Build Domain'
    }

    static get description() {
        return 'Build domain.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return [DOMAIN_TYPE]
    }

    static get options() {
        return {
            protocol: {
                type: 'string',
                description: 'The brand',
                default: 'brand'
            }
        }
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1000
    }

    async handle({ id: source = '', label = '' }, { brand = 'brand' }) {
        const domain = `${brand}@${label}`

        const results = []

        results.push(this.makeNode({ type: DOMAIN_TYPE, label: domain, props: { domain }, edges: [source] }))

        return results
    }
}

const splitUri = class extends Transform {
    static get alias() {
        return ['split_uri', 'su']
    }

    static get title() {
        return 'Split URI'
    }

    static get description() {
        return 'Split URI.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return [URI_TYPE]
    }

    static get options() {
        return {}
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1000
    }

    async handle({ id: source = '', label = '' }) {
        const url = require('url')

        const { hostname: domain } = url.parse(label)

        const results = []

        if (domain) {
            results.push(this.makeNode({ type: DOMAIN_TYPE, label: domain, props: { domain }, edges: [source] }))
        }

        return results
    }
}

const buildUri = class extends Transform {
    static get alias() {
        return ['build_uri', 'bu']
    }

    static get title() {
        return 'Build URI'
    }

    static get description() {
        return 'Build URI.'
    }

    static get group() {
        return this.title
    }

    static get tags() {
        return ['ce', 'offline']
    }

    static get types() {
        return [DOMAIN_TYPE]
    }

    static get options() {
        return {
            protocol: {
                type: 'string',
                description: 'The URI protocol.',
                default: 'http'
            },

            port: {
                type: 'string',
                description: 'The URI port.',
                default: ''
            }
        }
    }

    static get priority() {
        return 1
    }

    static get noise() {
        return 1000
    }

    async handle({ id: source = '', label = '' }, { protocol = 'http', port = '' }) {
        const url = require('url')

        const isHttp = protocol === 'http' && (!port || port === '80')
        const isHttps = protocol === 'https' && (!port || port === '443')

        const uri = url.format({ hostname: label, protocol: `${protocol}:`, port: isHttp || isHttps ? undefined : port })

        const results = []

        results.push(this.makeNode({ type: URI_TYPE, label: uri, props: { uri }, edges: [source] }))

        return results
    }
}

module.exports = {
    noop,
    duplicate,
    extract,
    prefix,
    suffix,
    augment,
    splitEmail,
    buildEmail,
    splitDomain,
    buildDomain,
    splitUri,
    buildUri
}
