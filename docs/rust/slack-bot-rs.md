---
id: slack-bot-rs
title: Slack Bot in Rust
sidebar_label:
slug: /rust/slack-bot-rs
---

## Slack Bot in Rust

- Write Slack Bot Code
- Build Slack Bot
- Configure Bot with systemd unit

### Docs

- [ansible](https://docs.ansible.com/)
- [Ubuntu](https://releases.ubuntu.com/20.04/)
- [rust](https://www.rust-lang.org/tools/install)
- [slack-rs repository](https://github.com/slack-rs/slack-rs)
- [slack-rs document](https://slack-rs.github.io/slack-rs/slack/index.html)
- [structopt](https://docs.rs/structopt/0.3.21/structopt/)
- [env_logger](https://docs.rs/env_logger/0.8.2/env_logger/)

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

- rust(using cargo, with nightly)

```bash
$ cargo --version
cargo 1.49.0-nightly (2af662e22 2020-11-12)
```

### Write Rust Code

Full Code: [https://github.com/kkdm/slack-bot-rs](https://github.com/kkdm/slack-bot-rs)

#### `Cargo.toml`

```toml
[dependencies]
slack = "0.25.0"
structopt = "0.3"
regex = "1"
reqwest = "0.9.*"
serde = "*"
log = "0.4.0"
env_logger = "0.8.2"
```

#### `main.rs`

##### `fn main`

1. Setup logger
2. Parse options
3. Get slack token from env
4. Run slack bot RTM client

###### Code

```rust
use env_logger;
use log::{error, warn, info, debug};
use std::env;
use std::process;
use slack::{RtmClient, Event, EventHandler};

fn main() {
    env::set_var("RUST_LOG", "info");
    env_logger::init();
    let opt = Opt::from_args();
    
    let token = 
        match env::var("SLACK_TOKEN") { 
            Err(_) if &opt.token == "" => {
                error!("error: slack token not specified");
                process::exit(1);
            },
            Err(_) => opt.token,
            Ok(v) => v,
        };

    let mut handler = Handler;
    let r = RtmClient::login_and_run(&token, &mut handler);

    match r {
        Ok(_) => {},
        Err(err) => panic!("Error: {}", err)
    }
}
```

##### `struct Opt`

###### Code

```rust
use structopt::StructOpt;

#[derive(StructOpt, Debug)]
#[structopt(name = "slack-bot-rs")]
pub struct Opt {
    /// Bot token (env SLACK_TOKEN is also available)
    #[structopt(short = "t", long = "token", default_value = "")]
    token: String,

    /// Bot name
    #[structopt(required = true, short = "n", long = "bot-name")]
    bot_name: String,

    /// API server endpoint
    #[structopt(required = true, short = "s", long = "api-server")]
    api_server: String,
}
```

##### `impl EventHandler for Handler`

1. Define your handler (in this code, `Handler`)
2. Implement `EventHandler` for your Handler
3. Only catch `Message` event with `Event::Message` [detail](https://slack-rs.github.io/slack-rs/slack/enum.Event.html)
4. Only catch `Standard` (normal user's post) message with `slack::Message::Standard` [detail](https://slack-rs.github.io/slack-rs/slack/enum.Message.html)
5. Get Bot ID from bot name in the channel
6. Do some process
7. Send back message(If you need)

###### Code

```rust
struct Handler;

impl EventHandler for Handler {
    fn on_event(&mut self, cli: &RtmClient, event: Event) {
        if let Event::Message(e) = event {
            if let slack::Message::Standard(m) = *e {
                let opt = Opt::from_args();
                let bot_id = helper::get_bot_id(cli, &opt.bot_name);
                let channel_id = m.channel.unwrap();
                let txt = m.text.unwrap();

                if !txt.contains(&bot_id) {
                    return
                }

                helper::send_msg(cli, &channel_id, &"some message");
            }
        }
    }

    fn on_close(&mut self, _cli: &RtmClient) {
        debug!("on_close");
    }

    fn on_connect(&mut self, _cli: &RtmClient) {
        info!("connected");
    }
}
```

#### `helper.rs`

##### `fn get_bot_id`

1. Get all users
2. Only filter the one matches the bot name

###### Code

```rust
use slack;
use slack::RtmClient;

fn get_bot_id(cli: &RtmClient, bot_name: &String) -> String {
    cli
    .start_response()
    .users
    .as_ref()
    .and_then(|users| {
        users.iter().find(|user| match &user.name {
            None => false,
            Some(n) => n == bot_name,
        })
    })
    .and_then(|user| user.id.as_ref())
    .expect("the bot not found")
    .to_string()
}
```

##### `fn send_msg`

###### Code

```rust
use slack;
use slack::RtmClient;

fn send_msg(cli: &RtmClient, channel_id: &String, msg: &str) -> () {
    let _ = cli
        .sender()
        .send_message(channel_id, msg);
}
```

### Build

#### `Makefile`

```
build:
	cargo build --release
```

#### Build

```bash
$ make build
```

### Prepare ansible code

#### `slack_bot.yml`

```yaml
---
- hosts: yourhost
  remote_user: kkdm
  become: true
  roles:
  - slack_bot
```

#### Tasks

##### `roles/slack_bot/tasks/main.yml`

```yaml
- import_tasks: user.yml
- import_tasks: install.yml
- import_tasks: configure.yml
- import_tasks: service.yml
```

##### `roles/slack_bot/tasks/user.yml`

```yaml
- name: create some group
  group:
    name: somegrp
    state: present

- name: create some user
  user:
    name: someuser
    home: /usr/local/userdir
    group: somegrp
    append: true
```

##### `roles/slack_bot/tasks/install.yml`

```yaml
- name: get slack-bot
  get_url:
    url: "{{ dl_url }}"
    dest: /usr/local/bin
    mode: '0755'
```

##### `roles/slack_bot/tasks/configure.yml`

```yaml
- name: include vault vars
  include_vars: bot.yml

- name: create directories
  file:
    path: "{{ item }}"
    owner: someuser
    group: somegrp
    mode: 0755
    state: directory
  with_items:
  - /usr/local/userdir
  - /usr/local/userdir/logs

- name: put config file
  template:
    src: usr/local/userdir/bot.conf
    dest: /usr/local/userdir/bot.conf
    owner: someuser
    group: somegrp
    mode: 0644
  register: app_conf
```

##### `roles/slack_bot/tasks/service.yml`

```yaml
- name: put systemd unit file
  copy:
    src: etc/systemd/system/slack-bot.service
    dest: /etc/systemd/system/slack-bot.service
    owner: root
    group: root
    mode: 0644
  register: slackbot_systemd

- name: start service
  systemd:
    name: slack-bot
    daemon_reload: true
    state: restarted
    enabled: true
  when: slackbot_systemd.changed
```

#### Vars

##### `roles/slack_bot/vars/main.yml`

```yaml
version: '0.2.0'
dl_url: "https://github.com/kkdm/slack-bot-rs/releases/download/{{ version }}/slack-bot"
```

##### `roles/slack_bot/vars/bot.yml`

```bash
ansible-vault create roles/slack_bot/vars/bot.yml
```

#### Files & Templates

##### `roles/slack_bot/templates/usr/local/userdir/bot.conf`

These variables are filled by vault vars.

```
BOT_NAME={{ BOT_NAME }}
API_SERVER={{ API_SERVER }}
SLACK_TOKEN={{ SLACK_TOKEN }}
```

##### `roles/slack_bot/files/etc/systemd/system/slack-bot.service`

```
[Unit]
Description=Slack Bot
Documentation=https://github.com/kkdm/slack-bot-rs
Wants=network.target
After=network.target

[Service]
Type=simple
User=someuser
EnvironmentFile=/usr/local/userdir/bot.conf
ExecStart=/usr/local/bin/slack-bot \
    --bot-name ${BOT_NAME} \
    --api-server ${API_SERVER}

ExecReload=/bin/kill -SIGUSR1 $MAINPID
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Execute ansible

```bash
ansible-playbook -v -K slack_bot.yml
```
