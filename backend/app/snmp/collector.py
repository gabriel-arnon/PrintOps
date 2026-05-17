from pysnmp.hlapi import (
    getCmd,
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity
)

# =========================
# SINGLE OID
# =========================

def get_snmp_data(

    ip,
    oid,

    timeout=2,
    retries=2

):

    iterator = getCmd(

        SnmpEngine(),

        CommunityData('public'),

        UdpTransportTarget(

            (ip, 161),

            timeout=timeout,
            retries=retries

        ),

        ContextData(),

        ObjectType(
            ObjectIdentity(oid)
        )

    )

    errorIndication, errorStatus, errorIndex, varBinds = next(iterator)

    if errorIndication:

        raise Exception(
            str(errorIndication)
        )

    if errorStatus:

        raise Exception(
            str(errorStatus)
        )

    for varBind in varBinds:

        return str(varBind[1])


# =========================
# MULTIPLE OIDS
# =========================

def get_multiple_snmp_data(

    ip,
    oids,

    timeout=0.5,
    retries=1

):

    iterator = getCmd(

        SnmpEngine(),

        CommunityData('public'),

        UdpTransportTarget(

            (ip, 161),

            timeout=timeout,
            retries=retries

        ),

        ContextData(),

        *[
            ObjectType(
                ObjectIdentity(oid)
            )
            for oid in oids
        ]

    )

    errorIndication, errorStatus, errorIndex, varBinds = next(iterator)

    if errorIndication:

        raise Exception(
            str(errorIndication)
        )

    if errorStatus:

        raise Exception(
            str(errorStatus)
        )

    return [

        str(varBind[1])

        for varBind in varBinds

    ]