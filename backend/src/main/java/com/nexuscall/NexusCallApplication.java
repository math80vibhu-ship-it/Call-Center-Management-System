package com.nexuscall;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class NexusCallApplication {
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("  Starting NexusCall Enterprise Backend (Core Java JDBC)   ");
        System.out.println("  PostgreSQL Relational Storage • No ORM • HikariCP Pool   ");
        System.out.println("==========================================================");
        SpringApplication.run(NexusCallApplication.class, args);
    }
}
