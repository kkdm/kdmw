---
id: setup-coredns
title: Setup CoreDNS node
sidebar_label: 
slug: /dns/setup-coredns
---

## Setup CoreDNS node as home DNS server

- Install CoreDNS binary
- Configure CoreDNS
- Create CoreDNS systemd unit

### Official docs

- [ansible](https://docs.ansible.com/)
- [Ubuntu](https://releases.ubuntu.com/20.04/)
- [CoreDNS](https://coredns.io/)

### Prerequisite

#### Setup workstation

- Ubuntu 20.04

```bash
$ cat /etc/lsb-release 
DISTRIB_ID=Ubuntu
DISTRIB_RELEASE=20.04
DISTRIB_CODENAME=focal
DISTRIB_DESCRIPTION="Ubuntu 20.04 LTS"
```
- ansible

```bash
$ sudo apt-get install ansible
$ ansible --version | grep 'ansible [0-9]'
ansible 2.9.6
```

#### Setup target node

- raspberry pi 3B+ (anything is fine)

### Disable systemd-resolved (If it's running)

We probably have systemd-resolved running on our target node by default. It uses port 53(usually used for dns interaction) by default.

To check that, we may run below. If it's running, we'll stop and disable it.
```bash
systemctl status systemd-resolved
```

#### Prepare ansible's playbook
```
$ cat 01_disable_systemd_resolved.yml 
- hosts: rpies
  remote_user: myuser
  tasks:
  - name: disable systemd-resolved
    systemd:
      name: systemd-resolved
      state: stopped
      enabled: false
    become: true
  - name: resolv.conf symlink               # This is to use normal resolv.conf
    file:
      src: /run/systemd/resolve/resolv.conf
      dest: /etc/resolv.conf
      owner: root
      group: root
      state: link
    become: true
```

#### Run ansible-playbook (test)

```bash
ansible-playbook -v -C -K -i hosts 01_disable_systemd_resolved.yml
```

#### Run ansible-playbook

```bash
ansible-playbook -v -K -i hosts 01_disable_systemd_resolved.yml
```

### Install CoreDNS

For this installation, We'll use CoreDNS version 1.6.9 as latest(on May 23rd 2020). Latest version is available [here](https://github.com/coredns/coredns/releases)

#### Prepare ansible playbook
```
$ cat 02_install_coredns.yml 
- hosts: rpies
  remote_user: myuser
  tasks:
  - name: get coredns
    get_url:
      url: 'https://github.com/coredns/coredns/releases/download/v1.6.9/coredns_1.6.9_linux_arm64.tgz'
      dest: /usr/local/src
      checksum: sha256:4090b684533cfe9ec57ba5154cd960440837c5ecfea94d8a4ff102e38cdd08ab
    become: true
  - name: coredns unarchive
    unarchive:
      src: /usr/local/src/coredns_1.6.9_linux_arm64.tgz
      dest: /usr/local/bin
      remote_src: true
      creates: /usr/local/bin/coredns
    become: true
  - name: Ensure coredns group exists
    group:
      name: coredns
      state: present
    become: true
  - name: create coredns user
    user:
      name: coredns
      home: /var/lib/coredns
      group: coredns
    become: true
```


#### Run ansible-playbook (test)

```bash
ansible-playbook -v -C -K -i hosts 02_install_coredns.yml
```

#### Run ansible-playbook

```bash
ansible-playbook -v -K -i hosts 02_install_coredns.yml
```

### Configure CoreDNS

We can tell CoreDNS where config file is. We'll create

- `/etc/coredns` for CoreDNS config files
- `/etc/coredns/zones` for each zone config files
- `/etc/coredns/Corefile` for CoreDNS root config
- `/etc/coredns/zones/example.com.db` for our zone

#### Prepare ansible playbook
```
- hosts: rpies
  remote_user: myuser
  tasks:
  - name: Create /etc/coredns directory
    file:
      path: /etc/coredns
      owner: coredns
      group: coredns
      mode: 0755
      state: directory
    become: true
  - name: Create /etc/coredns/zones directory
    file:
      path: /etc/coredns/zones
      owner: coredns
      group: coredns
      mode: 0755
      state: directory
    become: true
  - name: Put file for coredns
    copy:
      src: files/etc/coredns/Corefile
      dest: /etc/coredns/Corefile
      mode: 0644
      owner: coredns
      group: coredns
    become: true
  - name: Put local zone file
    copy:
      src: files/etc/coredns/zones/example.com.db
      dest: /etc/coredns/zones/example.com.db
      mode: 0644
      owner: coredns
      group: coredns
    become: true
  - name: restart coredns service
    systemd:
      name: coredns
      state: restarted
      enabled: true
    become: true
```

#### Prepare Corefile

```
$ cat files/etc/coredns/Corefile 
.:53 {
    forward . 8.8.8.8 9.9.9.9
    log
    errors
    health :8080
    prometheus 0.0.0.0:9153
}

example.com {
    file /etc/coredns/zones/example.com.db
    log
    errors
}
```

#### Prepare zone file

```
$ cat files/etc/coredns/zones/example.com.db
example.com.           IN SOA dns.example.com. myuser.example.com. 2019042917 7200 3600 1209600 3600
shibuya.example.com.   IN A 12.34.5.61
tokyo.example.com.     IN A 12.34.5.62
ebisu.example.com.     IN A 12.34.5.63
shinjuku.example.com.  IN A 12.34.5.64
```

#### Run ansible-playbook (test)

```bash
ansible-playbook -v -C -K -i hosts 03_configure_coredns.yml
```

#### Run ansible-playbook

```bash
ansible-playbook -v -K -i hosts 03_configure_coredns.yml
```

### Create systemd unit

#### Prepare ansible playbook

```
$ cat 04_create_service.yml
- hosts: rpies
  remote_user: myuser
  tasks:
  - name: Create /usr/local/lib/systemd directory
    file:
      path: /usr/local/lib/systemd
      owner: root
      group: root
      mode: 0755
      state: directory
    become: true
  - name: Create /usr/local/lib/systemd/system directory
    file:
      path: /usr/local/lib/systemd/system
      owner: root
      group: root
      mode: 0755
      state: directory
    become: true
  - name: put unit file
    copy:
      src: files/usr/local/lib/systemd/system/coredns.service
      dest: /usr/local/lib/systemd/system/coredns.service
      owner: root
      group: root
      mode: 0644
    become: true
  - name: put sysusers conf
    copy:
      src: files/usr/lib/sysusers.d/coredns-sysusers.conf
      dest: /usr/lib/sysusers.d/coredns-sysusers.conf
      owner: root
      group: root
      mode: 0644
    become: true
  - name: put tmpfiles conf
    copy:
      src: files/usr/lib/tmpfiles.d/coredns-tmpfiles.conf
      dest: /usr/lib/sysusers.d/coredns-tmpfiles.conf
      owner: root
      group: root
      mode: 0644
    become: true
  - name: start coredns service
    systemd:
      name: coredns
      state: started
      enabled: true
      daemon_reload: true
    become: true
```

#### Prepare service unit file

```
$ cat files/usr/local/lib/systemd/system/coredns.service 
[Unit]
Description=CoreDNS DNS server
Documentation=https://coredns.io
After=network.target

[Service]
PermissionsStartOnly=true
LimitNOFILE=1048576
LimitNPROC=512
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE
NoNewPrivileges=true
User=coredns
WorkingDirectory=~
ExecStart=/usr/local/bin/coredns -conf=/etc/coredns/Corefile
ExecReload=/bin/kill -SIGUSR1 $MAINPID
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

#### Prepare sysuser conf file

```
$ cat files/usr/lib/sysusers.d/coredns-sysusers.conf 
u coredns - "CoreDNS is a DNS server that chains plugins" /var/lib/coredns
```

#### Prepare tmpfile conf file

```
$ cat files/usr/lib/tmpfiles.d/coredns-tmpfiles.conf 
d /var/lib/coredns 0755 coredns coredns -
```

#### Run ansible-playbook (test)

```bash
ansible-playbook -v -C -K -i hosts 04_create_service.yml
```

#### Run ansible-playbook

```bash
ansible-playbook -v -K -i hosts 04_create_service.yml
```

## References

- [CoreDNS systemd unit](https://github.com/coredns/deployment/tree/master/systemd)
- [systemd-resolved](https://www.freedesktop.org/software/systemd/man/systemd-resolved.service.html)
